'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const merchantID = uuid.v4();
const walletID = uuid.v4();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const randomString1 = crypto.randomBytes(3).toString('hex');
const email1 = `test.${randomString1}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleWallet = { ...require('../spec/sample-docs/Wallets'), _id: walletID, email: email1 };
let authToken = '';
const orderID = uuid.v4();
const pass = uuid.v4();
const utils = require('../utils');
const passToken = utils.hashToken(pass);
const samplePass = { ...require('../spec/sample-docs/Passes'), _id: pass, walletID: sampleWallet._id, passToken: pass };
const sampleVoucher = { ...require('../spec/sample-docs/Vouchers'), _id: uuid.v4(), passToken: passToken, voucherToken: uuid.v4(), orderID: orderID };
sampleVoucher.issuer.merchantID = merchantID;
sampleVoucher.notificationSubscribers = [
    {
        'walletID': walletID,
        'events': 'redemption'
    }
];
const pendingOrder = {
    _id: orderID,
    docType: 'order',
    orderDate: new Date(),
    orderStatus: 'pending',
    transactionID: uuid.v4(),
    transactionStatus: 'paid',
    amountPaid: 120,
    vatAmount: 100,
    currency: 'SEK',
    webShopID: uuid.v4(),
    webShopName: 'webShopName',
    customerEmail: 'abc@gmail.com',
    receiverEmail: 'abc@gmail.com',
    products: [{ 'productID': uuid.v4() }],
    createdDate: new Date(),
    updatedDate: new Date(),
    partitionKey: orderID,
    sellerMerchantID: uuid.v4()
};

describe('send-voucher-delivery', () => {

    before(async () => {
        sampleUser.merchants = [];
        sampleUser.merchants.push({
            merchantID: merchantID,
            merchantName: 'Test'
        });
        
        var salt = bcrypt.genSaltSync(12);
        sampleWallet.vourityID = randomString1;
        sampleWallet.mobilePhone = '+46701234567786';
        sampleWallet.partitionKey = sampleWallet._id;
        var hash = bcrypt.hashSync(sampleWallet.walletHolder.password, salt);
        sampleWallet.walletHolder.password = hash;
        await request.post(process.env.USER_API_URL + '/api/' + process.env.USER_API_VERSION + '/users', {
            body: sampleUser,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const token = await request.post(process.env.USER_API_URL + '/api/' + process.env.USER_API_VERSION + '/login', {
            body: {
                email: sampleUser.email,
                password: sampleUser.password
            },
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        authToken = token.token;
        const url = process.env.WALLET_API_URL + '/api/' + process.env.WALLET_API_VERSION + '/wallets';
        await request.post(url, {
            body: sampleWallet,
            json: true,
            headers: {
                'x-functions-key': process.env.WALLET_API_KEY
            }
        });
        const url1 = process.env.PASSES_API_URL + '/api/' + process.env.PASSES_API_VERSION + '/passes';
        await request.post(url1, {
            body: samplePass,
            json: true,
            headers: {
                'x-functions-key': process.env.PASSES_API_KEY
            }
        });
        await request.post(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/vouchers`, {
            body: sampleVoucher,
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
        await request.post(`${process.env.ORDER_API_URL}/api/${process.env.ORDER_API_VERSION}/orders-doc`, {
            body: pendingOrder,
            json: true,
            headers: {
                'x-functions-key': process.env.ORDER_API_KEY
            }
        });
    });


    it('should throw error if user not login', async () => {
        try {
            const url = `${helpers.API_URL}/api/v1/send-voucher-delivery`;
            await request.post(url, {
                json: true
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Unable to authenticate user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };
            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });
    
    it('should send voucher delivery when all cases pass', async () => {
        const result = await request.post(`${helpers.API_URL}/api/v1/send-voucher-delivery`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            },
            body: {
                voucherID: sampleVoucher._id,
                notificationType: 'email'
            }
        });
        expect(result).not.to.be.null;
        expect(result.description).to.eql('Successfully send voucher delivery');

    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.WALLET_API_URL}/api/${process.env.WALLET_API_VERSION}/wallets/${sampleWallet._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.WALLET_API_KEY
            }
        });
        await request.delete(`${process.env.PASSES_API_URL}/api/${process.env.PASSES_API_VERSION}/passes/${samplePass._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.PASSES_API_KEY
            }
        });
        await request.delete(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/vouchers/${sampleVoucher._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
        await request
            .delete(`${process.env.ORDER_API_URL}/api/${process.env.ORDER_API_VERSION}/orders/${orderID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.ORDER_API_KEY
                }
            });
    });

});