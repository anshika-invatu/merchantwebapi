'use strict';

const genericErrorCodes = [
    'EmptyRequestBodyError',
    'InvalidUUIDError'
];

exports.voucherApiErrorCodes = genericErrorCodes.concat([
    'DuplicateVoucherError',
    'VoucherNotFoundError',
    'MissingPassTokenError',
    'MissingVoucherTokenError',
    'VoucherRedeemdedError',
    'VoucherExpiredError',
    'VoucherValidWeekdaysError',
    'VoucherValidTimeError',
    'IncorrectVoucherPinCodeError',
    'MissingRedemptionCodeError',
    'IncorrectRedemptionCodeError',
    'MissingSalesPersonCodeError',
    'MissingFixedAmountError',
    'MissingCurrencyError',
    'VoucherCurrencyMismatchError',
    'RedemptionFixedAmountExceededError',
    'MissingRedemptionsCountError',
    'NoRedemptionsLeftError',
    'MissingWebShopTokenError',
    'ProductNotFoundError'
]);

