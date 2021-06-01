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

    public render(ctx: CanvasRenderingContext2D, scale: number, x: number, y: number) {
        let alpha = 1 - this.noise * 0.2;
        ctx.fillStyle = `rgb(${this.color.red * alpha}, ${this.color.green * alpha}, ${this.color.blue * alpha})`;
        ctx.fillRect(x * scale, y * scale, scale, scale);
    }

    public getPointsTo(from: { x: number, y: number }, to: { x: number, y: number }): { x: number, y: number }[]
    {
        let result = [];
        for (let i = from.y; i <= to.y; i++)
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