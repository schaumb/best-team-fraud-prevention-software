export type Address = {
    zipCode: string;
    country: string;
    city: string;
    street: string;
};
export type ValidateTransactionRequestDto = {
    userId: string;
    cardNumber: string;
    ip: string;
    lat: number;
    long: number;
    billingAddress: Address,
    shippingAddress: Address
};
