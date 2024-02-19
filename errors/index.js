'use strict';

/**
 * Base error for custom errors thrown by Consumer API function app.
 */
class BaseError extends Error {
    constructor (message, code) {
        super(message);
        this.name = 'ConsumerApiFunctionsBaseError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.BaseError = BaseError;

class ConsumerApiServerError extends BaseError {
    constructor (message, code) {
        super(message, code);
        this.name = 'ConsumerApiServerError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ConsumerApiServerError = ConsumerApiServerError;

class InvalidUUIDError extends BaseError {
    constructor (message, code) {
        super(message, code);
        this.name = 'InvalidUUIDError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.InvalidUUIDError = InvalidUUIDError;

class VoucherApiError extends BaseError {
    constructor (name, message, code) {
        super(message, code);
        this.name = name;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.VoucherApiError = VoucherApiError;

class MerchantWebApiServerError extends BaseError {
    constructor (name, message, code) {
        super(message, code);
        this.name = name;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.MerchantWebApiServerError = MerchantWebApiServerError;

class ClearingReportNotFoundError extends BaseError {
    constructor (name, message, code) {
        super(message, code);
        this.name = name;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ClearingReportNotFoundError = ClearingReportNotFoundError;

class OrdersApiError extends BaseError {
    constructor (name, message, code) {
        super(message, code);
        this.name = name;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.OrdersApiError = OrdersApiError;

class MissingWebShopTokenError extends BaseError {
    constructor (name, message, code) {
        super(message, code);
        this.name = name;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.MissingWebShopTokenError = MissingWebShopTokenError;

class EmptyRequestBodyError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'EmptyRequestBodyError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.EmptyRequestBodyError = EmptyRequestBodyError;

class StatusCodeNotValidError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'StatusCodeNotValidError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.StatusCodeNotValidError = StatusCodeNotValidError;

class PriceplanNotFoundError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'PriceplanNotFoundError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.PriceplanNotFoundError = PriceplanNotFoundError;

class UserNotAuthenticatedError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'UserNotAuthenticatedError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.UserNotAuthenticatedError = UserNotAuthenticatedError;

class BookingNotFoundError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'BookingNotFoundError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.BookingNotFoundError = BookingNotFoundError;

class AlreadyRefundedError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'AlreadyRefundedError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AlreadyRefundedError = AlreadyRefundedError;

class LandingPageNotFoundError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'LandingPageNotFoundError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.LandingPageNotFoundError = LandingPageNotFoundError;

class SiteMenuIDNotFoundError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'SiteMenuIDNotFoundError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.SiteMenuIDNotFoundError = SiteMenuIDNotFoundError;

class MissingAccountMerchantID extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'MissingAccountMerchantID';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.MissingAccountMerchantID = MissingAccountMerchantID;

class MissingMerchantID extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'MissingMerchantID';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.MissingMerchantID = MissingMerchantID;

class FieldValidationError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'FieldValidationError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.FieldValidationError = FieldValidationError;

class ActionCodeFormatError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'ActionCodeFormatError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ActionCodeFormatError = ActionCodeFormatError;

class BusinessUnitNotFoundError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'BusinessUnitNotFoundError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.BusinessUnitNotFoundError = BusinessUnitNotFoundError;

class BalanceAccountNotLinkedError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'BalanceAccountNotLinkedError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.BalanceAccountNotLinkedError = BalanceAccountNotLinkedError;

class VouchersLinkedError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'VouchersLinkedError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.VouchersLinkedError = VouchersLinkedError;

class PointOfServiceNotFoundError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'PointOfServiceNotFoundError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.PointOfServiceNotFoundError = PointOfServiceNotFoundError;

class SalesPersonsNotFoundError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'SalesPersonsNotFoundError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.SalesPersonsNotFoundError = SalesPersonsNotFoundError;

class MerchantLinkedError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'MerchantLinkedError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.MerchantLinkedError = MerchantLinkedError;

class MerchantNotFoundError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'MerchantNotFoundError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.MerchantNotFoundError = MerchantNotFoundError;

class PointOfServiceAlreadyExistError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'PointOfServiceAlreadyExistError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.PointOfServiceAlreadyExistError = PointOfServiceAlreadyExistError;

class SalesPersonsAlreadyExistError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'SalesPersonsAlreadyExistError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.SalesPersonsAlreadyExistError = SalesPersonsAlreadyExistError;

class ConsentAlreadyExistError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'ConsentAlreadyExistError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ConsentAlreadyExistError = ConsentAlreadyExistError;

class ConsentNotFoundError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'ConsentNotFoundError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ConsentNotFoundError = ConsentNotFoundError;

class SendNotificationNotFoundError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'SendNotificationNotFoundError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.SendNotificationNotFoundError = SendNotificationNotFoundError;

class PayoutFrequencyNotFoundError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'PayoutFrequencyNotFoundError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.PayoutFrequencyNotFoundError = PayoutFrequencyNotFoundError;

class MerchantBalanceNotFoundError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'MerchantBalanceNotFoundError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.MerchantBalanceNotFoundError = MerchantBalanceNotFoundError;

class PayoutBankAccountsNotFoundError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'PayoutBankAccountsNotFoundError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.PayoutBankAccountsNotFoundError = PayoutBankAccountsNotFoundError;

class BankAccountAlreadyExistError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'BankAccountAlreadyExistError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.BankAccountAlreadyExistError = BankAccountAlreadyExistError;

class BalanceAccountAlreadyExistError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'BalanceAccountAlreadyExistError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.BalanceAccountAlreadyExistError = BalanceAccountAlreadyExistError;

class PaymentTransactionsNotFoundError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'PaymentTransactionsNotFoundError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.PaymentTransactionsNotFoundError = PaymentTransactionsNotFoundError;

class OrderNotFoundError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'OrderNotFoundError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.OrderNotFoundError = OrderNotFoundError;

class StripeError  extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'StripeError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.StripeError = StripeError;

class InvoiceNotFoundError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'InvoiceNotFoundError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.InvoiceNotFoundError = InvoiceNotFoundError;

class PricePlanNotExistError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'PricePlanNotExistError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.PricePlanNotExistError = PricePlanNotExistError;

class NotEnabledError extends BaseError {
    constructor (message, code) {
        super(message);
        this.name = 'NotEnabledError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.NotEnabledError = NotEnabledError;