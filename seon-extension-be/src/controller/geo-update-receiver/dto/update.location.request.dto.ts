export type UpdateLocationRequestDTO = {
    userId: string;
    type: "coarse"|"fine";
    lat: number;
    long: number; 
    timestamp: string
};