import { Liquid } from "./DustType/Liquid";
import { Sand } from "./DustType/Sand";
import { Solid } from "./DustType/Solid";
import { World } from "./World";

export type Color = {
    red: number;
    blue: number;
    green: number;
};

export type Dust = Liquid | Sand | Solid;

export class DustBase
{
    readonly noise: number;
    public color: Color;
    readonly rendered: boolean = false;

    public active: boolean = true;

    constructor (color: Color)
    {
        this.noise = Math.random();
        this.color = color;
    }

    public step(world: World, x: number, y: number)
    {

    }

    public render(setColor: (red: number, green: number, blue: number) => void) {
        let brightness = 1 - this.noise * 0.2;
        setColor(this.color.red * brightness, this.color.green * brightness, this.color.blue * brightness);
    }

    public getPointsTo(from: { x: number, y: number }, to: { x: number, y: number }): { x: number, y: number }[]
    {
        let result: { x: number, y: number }[] = [];
        if (from.y === to.y) {
            return [];
        }

        let yDir = from.y < to.y ? 1 : -1;
        for (let i = from.y; i * yDir <= to.y * yDir; i += yDir)
        {
            result.push({ x: from.x, y: i });
        }
        
        return result;
    }

    public activate()
    {
        this.active = true;
    }
}