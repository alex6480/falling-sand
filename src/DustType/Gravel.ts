import { DustBase } from "../Dust";
import { World } from "../World";
import { Sand } from "./Sand";

export class Gravel extends Sand
{
    public velocity: { x: number, y: number } = { x: 0, y: 0 };
    public dispersionFactor = 2;
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