export type ValidateTransactionRequestDto = {
    userId: string;
    cardNumber: string;
    ip: string;
    lat: number;
    long: number;
    billingAddress: {
        zipCode: string;
        country: string;
        city: string;
        
    }
};
