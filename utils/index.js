'use strict';

const Promise = require('bluebird');
const validator = require('validator');
const errors = require('../errors');
const {
    voucherApiErrorCodes
} = require('../errors/api-error-codes');
const crypto = require('crypto');
const jwt = require('jwt-simple');
const stripe = require('stripe')(process.env.STRIPE_API_KEY);
const { BlobServiceClient, generateBlobSASQueryParameters, ContainerSASPermissions, StorageSharedKeyCredential } = require('@azure/storage-blob');
const { ServiceBusClient } = require('@azure/service-bus');
const randomstring = require('randomstring');
const moment = require('moment');
const request = require('request-promise');
const balanceAccount = require('../spec/sample-docs/BalanceAccount');
const uuid = require('uuid');
const token = process.env.LOGGLY_TOKEN;



//For loggly related details please refer bac-91
exports.logEvents = async (message) => {
    var error = Object.assign({}, message);
    error.functionName = 'MerchantWebApi';
    await request.post(`${process.env.LOGGLE_URL}/inputs/${token}/tag/http/`, {
        json: true,
        body: error,
        headers: {
            'content-type': 'application/json'
        }
    });
};


exports.logInfo = async (message) => {
    var logMessage = Object.assign({}, message);
    logMessage.functionName = 'MerchantWebApi';
    logMessage.code = 200;
    await request.post(`${process.env.LOGGLE_URL}/inputs/${token}/tag/http/`, {
        json: true,
        body: logMessage,
        headers: {
            'content-type': 'application/json'
        }
    });
};

exports.handleError = (context, error) => {
    context.log.error(error);
    switch (error.constructor) {
        case errors.ActionCodeFormatError:
        case errors.PriceplanNotFoundError:
        case errors.InvalidUUIDError:
        case errors.StripeError:
            this.logKnownErrors(context, error);
            this.setContextResError(context, error);
            break;
        default:
            this.handleDefaultError(context, error);
            break;
    }
};

exports.validateUUIDField = (context, id, message = 'The id specified in the URL does not match the UUID v4 format.') => {
    return new Promise((resolve, reject) => {
        if (validator.isUUID(`${id}`, 4)) {
            resolve();
        } else {
            reject(
                new errors.InvalidUUIDError(message, 400)
            );
        }
    });
};

/**
 *
 * @param {any} context Context object from Azure function
 * @param {BaseError} error Custom error object of type base error
 */
exports.setContextResError = (context, error) => {
    const body = {
        code: error.code,
        description: error.message,
        reasonPhrase: error.name
    };

    context.res = {
        status: error.code,
        body: body
    };

    if (error.name !== 'StripeError') {
        this.logEvents(body);
    }
};

exports.handleDefaultError = (context, error) => {
    console.log(error.error);
    if (error.type === 'StripeInvalidRequestError') {
        let message;
        if (error.message) {
            message = error.message;
        } else {
            message = 'StripeInvalidRequestError';
        }
        this.setContextResError(
            context,
            new errors.StripeError(
                message,
                error.statusCode
            )
        );
    } else {
        const response = error.error;
        if (response && response.reasonPhrase) {
            if (voucherApiErrorCodes.includes(response.reasonPhrase)) {
                const errorFormatted = new errors.VoucherApiError(
                    response.reasonPhrase,
                    response.description,
                    response.code
                );

                this.setContextResError(
                    context,
                    errorFormatted
                );
                this.logKnownErrors(context, errorFormatted);
            } else {
                handleMerchantWebApiServerError(error, context);
            }
        } else {
            handleMerchantWebApiServerError(error, context);
        }
    }
};

exports.removeExtraText =  async (result, req) => {

    for (let i = 0; i < result.menu.length; i++) {
        let matchingLanguageText;
        for (const prop in result.menu[i].texts) {
            if (prop.toLowerCase() === req.query.languageCode.toLowerCase()) {
                matchingLanguageText = result.menu[i].texts[prop].text;
            }
        }
        delete result.menu[i].texts;
        result.menu[i].text = matchingLanguageText;
        if (result.menu[i].childNodes && Array.isArray(result.menu[i].childNodes)) {
            for (let j = 0; j < result.menu[i].childNodes.length; j++) {
                let matchingLanguageChildText;
                for (const childProp in result.menu[i].childNodes[j].texts) {
                    if (childProp.toLowerCase() === req.query.languageCode.toLowerCase()) {
                        matchingLanguageChildText = result.menu[i].childNodes[j].texts[childProp].text;
                    }
                }
                delete result.menu[i].childNodes[j].texts;
                result.menu[i].childNodes[j].text = matchingLanguageChildText;
            }
        }
    }
};

exports.logError = (context, error) => {
    const executionContext = context.executionContext;
    context.log.info({
        invocationId: executionContext.invocationId,
        functionName: executionContext.functionName,
        code: error.code,
        description: error.message,
        reasonPhrase: error.name,
        timestamp: new Date()
    });
};

exports.hashToken = token => crypto.createHash('sha512')
    .update(token)
    .digest('hex');

exports.logKnownErrors = (context, error) => {
    if (process.env.LOG_KNOWN_ERRORS === 'true') {
        this.logError(context, error);
    }
};

const handleMerchantWebApiServerError = (error, context) => {
    const errorFormatted = new errors.MerchantWebApiServerError(error.name, error.error.description || error, error.statusCode);
    this.logError(context, errorFormatted);
    this.setMerchantWebApiContextResError(context, error.error, error.statusCode);
};

exports.setMerchantWebApiContextResError = (context, error) => {
    const body = {
        code: error.code,
        description: error.description,
        reasonPhrase: error.reasonPhrase
    };

    context.res = {
        status: error.code,
        body: body
    };

    this.logEvents(body);
};

exports.authenticateRequest = (context, req) => {
    if (req.headers.authorization) {
        try {
            if (this.decodeToken(req.headers.authorization).exp <= new Date()) {
                return true;
            }
        } catch (e) {
            return false;
        }
    } else {
        return false;
    }
};

exports.decodeToken = (token) => {
    try {
        const decodedToken = jwt.decode(token, process.env.JWT_SECRET);
        return decodedToken;
    } catch (e) {
        return e;
    }
};

exports.balanceAccounts = (merchant) => {
    const startDate = moment.utc().toDate();
    const endDate = moment.utc().add(20, 'y')
        .toDate();
    balanceAccount._id = uuid.v4();
    balanceAccount.balanceAccountName = 'Balance Account';
    balanceAccount.balanceAccountDescription = 'Balance Account created when Merchant created';
    balanceAccount.balanceCurrency = merchant.merchantCurrency;
    balanceAccount.partitionKey = balanceAccount._id;
    balanceAccount.balanceAmount = 0;
    balanceAccount.isEnabled = true;
    balanceAccount.isDefault = true;
    balanceAccount.issuerMerchantID = merchant._id;
    balanceAccount.issuerMerchantName = merchant.merchantName;
    balanceAccount.isVirtualValue = false;
    balanceAccount.ownerID = merchant._id;
    balanceAccount.ownerType = 'merchant';
    balanceAccount.validFromDate = startDate;
    balanceAccount.validToDate = endDate;
    balanceAccount.creditLimit = 0;
    balanceAccount.creditInterestRate = 5;
    balanceAccount.createdDate = new Date();
    balanceAccount.updatedDate = new Date();
    return balanceAccount;
};

exports.subscribeStripeCustomer = (customerId, planId, taxPercent) => {
    const stripeActivity = 'SubscribeStripeCustomer';
    const logMessage = {};
    if (!taxPercent) {
        taxPercent = 25.00;
    }

    return new Promise((resolve, reject) => {
        stripe.subscriptions.create({
            customer: customerId,
            items: [{
                plan: planId
            }],
            tax_percent: taxPercent

        }, (err, subscriber) => {
            if (err) {
                context.log.error(err);
                logMessage.reasonPhrase = err.type;
                logMessage.code = err.statusCode;
                logMessage.stripeActivity = stripeActivity;
                this.logEvents(logMessage); // logs error
                reject(err); //for now its resolving on error also
            } else {
               
                logMessage.stripeActivity = stripeActivity;
                logMessage.message = 'Succesfully subscribed stripe customer';
                logMessage.code = 200;
                this.logInfo(logMessage);
                resolve(subscriber.id);
            }
        });
    });
};

exports.updateStripeCustomer = (customerId, vatNumber, invoiceAddress, merchantName) => {
    const stripeActivity = 'updateStripeCustomer';
    const logMessage = {};
    const address = {};
    if (invoiceAddress) {
        if (invoiceAddress.streetRow1) {
            address.line1 = invoiceAddress.streetRow1;
        } else {
            address.line1 = '';
        }
        if (invoiceAddress.streetRow2) {
            address.line2 = invoiceAddress.streetRow2;
        }
        if (invoiceAddress.city) {
            address.city = invoiceAddress.city;
        }
        if (invoiceAddress.state) {
            address.state = invoiceAddress.state;
        }
        if (invoiceAddress.country) {
            address.country = invoiceAddress.country;
        }
        if (invoiceAddress.zip) {
            address.postal_code = invoiceAddress.zip;
        }

    }
    const customer = {};
    if (address) {
        customer.shipping = {
            address: address,
            name: merchantName
        };
    }
    if (vatNumber) {
        customer.tax_info = {
            tax_id: vatNumber,
            type: 'vat'
        };
    }
    return new Promise((resolve, reject) => {
        stripe.customers.update(customerId,
            customer, (err, updatedCustomer) => {
                if (err) {
                    logMessage.reasonPhrase = err.type;
                    logMessage.code = err.statusCode;
                    logMessage.stripeActivity = stripeActivity;
                    this.logEvents(logMessage); // logs error
                    return reject(err);
                } else {
                    console.log(updatedCustomer.shipping);
                    console.log(updatedCustomer.tax_info);
                    logMessage.stripeActivity = stripeActivity;
                    logMessage.message = 'Succesfully update stripe customer';
                    logMessage.code = 200;
                    this.logInfo(logMessage);
                    return resolve(true);
                }
            });
    });
};

exports.createStripeCustomer = (email) => {
    const stripeActivity = 'CreateStripeCustomer';
    const logMessage = {};

    return new Promise((resolve, reject) => {
        stripe.customers.create({
            email: email,
        }, (err, customer) => {

            if (err) {
                console.log(err);
                logMessage.reasonPhrase = err.type;
                logMessage.code = err.statusCode;
                logMessage.stripeActivity = stripeActivity;
                this.logEvents(logMessage); // logs error
                return reject(err);
            } else {
                logMessage.stripeActivity = stripeActivity;
                logMessage.message = 'Succesfully created stripe customer';
                logMessage.code = 200;
                this.logInfo(logMessage);
                return resolve(customer);
            }
        });
    });
};

exports.createFortnoxCustomer = async (merchant) => {
    const Customer = {
        CustomerNumber: uuid.v4(),
        Email: merchant.email,
        Name: merchant.merchantName
    };
    if (merchant && merchant.invoiceAddress && merchant.invoiceAddress.length) {
        Customer.Address1 = merchant.invoiceAddress[0].streetRow1 ? merchant.invoiceAddress[0].streetRow1 : null;
        Customer.Address2 = merchant.invoiceAddress[0].streetRow2 ? merchant.invoiceAddress[0].streetRow2 : null;
        Customer.City = merchant.invoiceAddress[0].city ? merchant.invoiceAddress[0].city : null;
        Customer.Phone1 = merchant.invoiceAddress[0].invoicePhone ? merchant.invoiceAddress[0].invoicePhone : null;
        Customer.EmailInvoice = merchant.invoiceAddress[0].invoiceEmail ? merchant.invoiceAddress[0].invoiceEmail : null;
    }
    if (merchant && merchant.deliveryAddress && merchant.invoiceAddress.length) {
        Customer.DeliveryAddress1 = merchant.deliveryAddress[0].streetRow1 ? merchant.deliveryAddress[0].streetRow1 : null;
        Customer.DeliveryAddress2 = merchant.deliveryAddress[0].streetRow2 ? merchant.deliveryAddress[0].streetRow2 : null;
        Customer.DeliveryCity = merchant.deliveryAddress[0].city ? merchant.deliveryAddress[0].city : null;
        Customer.DeliveryPhone1 = merchant.deliveryAddress[0].invoicePhone ? merchant.deliveryAddress[0].invoicePhone : null;
        Customer.EmailOrder = merchant.deliveryAddress[0].invoiceEmail ? merchant.deliveryAddress[0].invoiceEmail : null;
    }

    try {
        const fortnoxCustomer = await request.post(process.env.FORTNOX_CUSTOMER_API, {
            body: {
                Customer
            },
            json: true,
            headers: {
                'Access-Token': process.env.FORTNOX_ACCESS_TOKEN,
                'Client-Secret': process.env.FORTNOX_CLIENT_SECRET,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        if (fortnoxCustomer) {
            return fortnoxCustomer;
        }
    } catch (err) {
        console.log(err);
    }
};

exports.deleteStripeCustomer = (customerId) => {
    const stripeActivity = 'DeleteStripeCustomer';
    const logMessage = {};

    return new Promise((resolve, reject) => {
        stripe.customers.del(customerId, (err, result) => {

            if (err) {
                console.log(err);
                logMessage.reasonPhrase = err.type;
                logMessage.code = err.statusCode;
                logMessage.stripeActivity = stripeActivity;
                this.logEvents(logMessage); // logs error
                return reject(err);
            } else {
                logMessage.stripeActivity = stripeActivity;
                logMessage.message = 'Succesfully deleted stripe customer';
                logMessage.code = 200;
                this.logInfo(logMessage);
                return resolve(result.deleted);
            }
        });
    });
};

exports.generateSasToken = async () => {

    // Create a SAS token that expires in half an hour
    // Set start time to five minutes ago to avoid clock skew.
    var startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() - 5);
    var expiryDate = new Date(startDate);
    expiryDate.setMinutes(startDate.getMinutes() + 30);

    const containerName = process.env.BLOB_CONTAINER;
    const sharedKeyCredential = new StorageSharedKeyCredential(process.env.AZURE_STORAGE_ACCOUNT, process.env.AZURE_STORAGE_ACCESS_KEY);

    const containerSAS = generateBlobSASQueryParameters({
        containerName: containerName, // Required
        permissions: ContainerSASPermissions.parse('racwdl'), // Required
        startsOn: startDate, // Required. Date type
        expiresOn: expiryDate, // Optional. Date type
        version: '2018-11-09' // Must >= 2018-11-09 to generate user delegation SAS
    },
    sharedKeyCredential
    ).toString();
    console.log(containerSAS);
    return Promise.resolve({
        sasToken: containerSAS,
        uri: process.env.STORAGE_ACCOUNT_BLOB_CONTAINER_URL
    });
};

exports.deleteBlob = async (blobName) => {
    var connString = process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING;
    const blobServiceClient = BlobServiceClient.fromConnectionString(connString);
    const containerName = process.env.BLOB_CONTAINER;
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const result = await containerClient.deleteBlob(blobName);
    return result;
};

exports.getInvoiceDetails = (invoiceID) => {
    const stripeActivity = 'GetInvoiceDetails';
    const logMessage = {};

    return new Promise((resolve, reject) => {
        stripe.invoices.retrieve(invoiceID, (err, invoice) => {
            if (err) {
                console.log(err);
                logMessage.reasonPhrase = err.type;
                logMessage.code = err.statusCode;
                logMessage.stripeActivity = stripeActivity;
                this.logEvents(logMessage); // logs error
                console.log(err);
                if (err.message && err.message.match(/No such invoice:/)) {
                    return resolve(err.message);
                } else {
                    return reject(err);
                }
            } else {
                logMessage.stripeActivity = stripeActivity;
                logMessage.message = 'Succesfully get the invoice details';
                logMessage.code = 200;
                this.logInfo(logMessage);
                return resolve(invoice);
            }
        });
    });
};

exports.getInvoiceList = (searchCriteria) => {
    const stripeActivity = 'GetInvoiceList';
    const logMessage = {};

    return new Promise((resolve, reject) => {
        stripe.invoices.list(
            searchCriteria, (err, invoices) => {
                if (err) {
                    console.log(err);
                    logMessage.reasonPhrase = err.type;
                    logMessage.code = err.statusCode;
                    logMessage.stripeActivity = stripeActivity;
                    this.logEvents(logMessage); // logs error
                    console.log(err);
                    if (err.message && err.message.match(/No such customer:/)) {
                        return resolve(err.message);
                    } else {
                        return reject(err);
                    }
                } else {
                    logMessage.stripeActivity = stripeActivity;
                    logMessage.message = 'Succesfully get the invoice list';
                    logMessage.code = 200;
                    this.logInfo(logMessage);
                    return resolve(invoices);
                }
            });
    });
};

exports.summarizedTransaction = (accountTransaction) => {
    const transactionsArray = [],
        keyArray = [],
        summaryArray = [];
    accountTransaction.forEach(element => {
        transactionsArray.push(...element.transactionItems);
    });

    transactionsArray.forEach(element => {
        if (keyArray.indexOf(element.accountNumber) === -1) {
            const transaction = {
                accountNumber: element.accountNumber,
                accountName: element.accountName,
                debit: element.debit,
                credit: element.credit
            };
            summaryArray.push(transaction);
            keyArray.push(element.accountNumber);
        } else {
            summaryArray[keyArray.indexOf(element.accountNumber)].credit += element.credit;
            summaryArray[keyArray.indexOf(element.accountNumber)].debit += element.debit;
        }

    });

    return summaryArray;
};

exports.generateRandomPassword = () => {
    const upperChars = randomstring.generate({
        length: 3,
        capitalization: 'uppercase'
    });
    return (upperChars + randomstring.generate(7));
};

exports.sendMessageToAzureBus = async (topic, message, context) => {
    if (topic && message) {
        const serviceBusClient = new ServiceBusClient(process.env.AZURE_BUS_CONNECTION_STRING);

        const sender = serviceBusClient.createSender(topic);

        const messages = { body: message, messageId: uuid.v4() };

        try {
            await sender.sendMessages(messages);
            if (context)
                context.log('Message sent');
            return true;
        } catch (error) {
            if (context)
                context.log(error);
            return false;
        }
    }
};

exports.detachStripeSource = (customerID, pspSource) => {
    const stripeActivity = 'DetachStripeSource';
    const logMessage = {};
    return new Promise((resolve, reject) => {
        stripe.customers.deleteSource(customerID, pspSource, (err, result) => {
            if (err) {
                logMessage.reasonPhrase = err.type;
                logMessage.code = err.statusCode;
                logMessage.stripeActivity = stripeActivity;
                this.logEvents(logMessage);
                console.log(err);
                if (err.message && err.message.match(/No such source:/)) {
                    return resolve(err);
                } else {
                    return reject(new errors.StripeError(
                        err.message,
                        err.statusCode
                    ));
                }

            } else {
                logMessage.stripeActivity = stripeActivity;
                logMessage.message = 'Succesfully detached the stripe source';
                logMessage.code = 200;
                this.logInfo(logMessage);
                console.log(result);
                return resolve(true);
            }
        });
    });
};

exports.createStripeSource = (customerID, pspSource) => {
    const stripeActivity = 'CreateStripeSource';
    const logMessage = {};
    return new Promise((resolve, reject) => {
        stripe.customers.createSource(customerID, { source: pspSource }, (err, result) => {
            if (err) {
                logMessage.reasonPhrase = err.type;
                logMessage.code = err.statusCode;
                logMessage.stripeActivity = stripeActivity;
                this.logEvents(logMessage);
                console.log(err);
                return reject(new errors.StripeError(
                    err.message,
                    err.statusCode
                ));
            } else {
                logMessage.stripeActivity = stripeActivity;
                logMessage.message = 'Succesfully create the stripe source';
                logMessage.code = 200;
                this.logInfo(logMessage);
                console.log(result);
                return resolve(result);
            }
        });
    });
};