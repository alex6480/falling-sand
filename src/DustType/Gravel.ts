import { DustBase } from "../Dust";
import { World } from "../World";
import { Sand } from "./Sand";

export class Gravel extends Sand
{
    public dispersionFactor = 0.5;
    public dispersionAmount = 0;

    constructor() {
        super();
        this.color = {
            red: 180,
            blue: 120,
            green: 180
        };
        this.dispersionAmount = 1;
    }
}