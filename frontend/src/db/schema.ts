export interface CarSpecs {
  horsepower?: number; topSpeed?: number; acceleration?: number; engine?: string;
  transmission?: string; drivetrain?: string; weight?: number; seats?: number;
}
export interface Brand { id:number; name:string; createdAt?:string }
export interface CarWithBrand {
  id:number; name:string; brandId:number; brandName:string; year:number; price:number;
  color:string; colorHex:string; description:string; thumbnail:string; images:string[];
  sketchfabUrl?:string|null; modelPath?:string|null; featured:boolean; specs:CarSpecs;
  features:string[]; createdAt?:string;sellerId?: number | null;
}
