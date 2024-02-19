'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
const uuid = require('uuid');
const lookup = require('country-code-lookup');

// Please refer the story BASE-454 for more details

module.exports = async (context, req) => {

    try {

        if (!utils.authenticateRequest(context, req)) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'Unable to authenticate user.',
                    401
                )
            );
            return Promise.reject();
        }
        
        let isMerchantLinked = false, merchantName;
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.params.id) {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
                merchantName = user.merchants[i].merchantName;
            }
        }
        if (!isMerchantLinked) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'MerchantID not linked to user',
                    401
                )
            );
            return Promise.resolve();
        }
        
        // lookup pointOfService doc from pointOfServiceID
        const pointOfServiceID = req.params.pointOfServiceID;
        const pointOfServiceDoc = await request.get(`${process.env.DEVICE_API_URL}/api/v1/point-of-service/${pointOfServiceID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        
        // lookup merchant doc from merchantID of pointOfService
        const merchantID = pointOfServiceDoc.merchantID;
        const merchantDoc = await request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${merchantID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        // lookup ocpiCredentials from merchantID
        let partyId = '';
        try {
            const ocpiCredentials = await request.post(`${process.env.EVENTS_PROCESSOR_API_URL}/api/${process.env.EVENTS_PROCESSOR_API_VERSION}/ocpi-credentials`, {
                json: true,
                body: {
                    merchantID: merchantID
                },
                headers: {
                    'x-functions-key': process.env.EVENTS_PROCESSOR_API_KEY
                }
            });
            for (const ocpiCredential of ocpiCredentials) {
                if (ocpiCredential.tokenType === 'C') {
                    partyId = ocpiCredential.roles[0].party_id;
                }
            }
        } catch (err) {
            partyId = '';
        }
        // get country iso3, iso2 from country name
        const countryDoc = lookup.byCountry(pointOfServiceDoc.location[0].country);

        const ocpiLocation = {
            country_code: countryDoc ? countryDoc.iso2 : '',
            party_id: partyId,
            id: pointOfServiceID,
            publish: pointOfServiceDoc.isEnabled,
            publish_allowed_to: [],
            name: pointOfServiceDoc.pointOfServiceName,
            address: pointOfServiceDoc.location[0].streetRow1,
            city: pointOfServiceDoc.location[0].city,
            postal_code: pointOfServiceDoc.location[0].zip,
            country: countryDoc ? countryDoc.iso3 : '',
            coordinates: {
                latitude: pointOfServiceDoc.location[0].latitude,
                longitude: pointOfServiceDoc.location[0].longitude
            },
            related_locations: [],
            directions: [],
            operator: {
                name: merchantDoc.merchantName,
                website: '',
                logo: {
                    url: merchantDoc.logoImageURL ? merchantDoc.logoImageURL : '',
                    thumbnail: merchantDoc.logoImageURL ? merchantDoc.logoImageURL : '',
                    category: 'OPERATOR',
                    type: merchantDoc.logoImageURL ? merchantDoc.logoImageURL.split('.')[1] : '',
                    height: 512,
                    width: 512
                }
            },
            facilities: [],
            time_zone: 'Europe/Stockholm',
            charging_when_closed: true,
            images: [],
            last_updated: pointOfServiceDoc.updatedDate
        };
        // create evse
        const evsesComponentDocs = await request.get(`${process.env.DEVICE_API_URL}/api/v1/components-by-pointofservice/${pointOfServiceID}?componentTypeCode=evse`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        const connetorsComponentDocs = await request.get(`${process.env.DEVICE_API_URL}/api/v1/components-by-pointofservice/${pointOfServiceID}?componentTypeCode=connector`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });

        const evses = [];
        for (const evseComponent of evsesComponentDocs) {
            const evse = {
                uid: evseComponent._id,
                evse_id: evseComponent.evse && evseComponent.evse.evseID ? evseComponent.evse.evseID : '',
                status: evseComponent.statusCode.toUpperCase(),
                status_schedule: [],
                capabilities: [
                    'CHARGING_PREFERENCES_CAPABLE',
                    'REMOTE_START_STOP_CAPABLE'
                ],
                physical_reference: evseComponent.evse && evseComponent.evse.evseNumber ? evseComponent.evse.evseNumber : '',
                directions: [],
                parking_restrictions: [],
                images: [],
                last_updated: evseComponent.updatedDate
            };
            const connectors = [];
            for (const connectorComponent of connetorsComponentDocs) {
                if (connectorComponent.parentComponentID === evseComponent._id) {
                    const connector = {
                        id: connectorComponent._id,
                        standard: getConnectorStandard(connectorComponent.connector && connectorComponent.connector.connectorTypeCode ? connectorComponent.connector.connectorTypeCode : ''),
                        format: connectorComponent.connector && connectorComponent.connector.connectorFormatCode ? connectorComponent.connector.connectorFormatCode : '',
                        power_type: connectorComponent.connector && connectorComponent.connector.powerTypeCode ? connectorComponent.connector.powerTypeCode : '',
                        max_voltage: connectorComponent.connector && connectorComponent.connector.maxVoltage ? connectorComponent.connector.maxVoltage : '',
                        max_amperage: connectorComponent.connector && connectorComponent.connector.maxCurrent ? connectorComponent.connector.maxCurrent : '',
                        max_electric_power: connectorComponent.connector && connectorComponent.connector.maxElectricPowerKw ? parseFloat(connectorComponent.connector.maxElectricPowerKw) * 1000 : 0,
                        tarrif_ids: [],
                        last_updated: connectorComponent.updatedDate
                    };
                    connectors.push(connector);
                }
            }
            evse.connectors = connectors;
            evses.push(evse);
        }

        ocpiLocation.evses = evses;
        ocpiLocation._id = uuid.v4();
        ocpiLocation.partitionKey = ocpiLocation._id;
        ocpiLocation.docType = 'ocpiLocation';
        ocpiLocation.adminRights = new Array();
            
        ocpiLocation.adminRights.push({
            merchantID: merchantID,
            merchantName: merchantName,
            roles: 'admin'
        });
        ocpiLocation.pointOfServiceID = pointOfServiceID;
        ocpiLocation.merchantID = merchantID;
        
        const result = await request.post(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/merchant-ocpi-location`, {
            body: ocpiLocation,
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });

        context.res = {
            body: result
        };
        return Promise.resolve();

    } catch (error) {
        utils.handleError(context, error);
    }
};

function getConnectorStandard (standard) {
    if (standard === 'type2') {
        return 'IEC_62196_T2';
    } else if (standard === 'ccs') {
        return 'IEC_62196_T2_COMBO';
    } else {
        return standard.toUpperCase();
    }
}