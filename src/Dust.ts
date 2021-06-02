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
export type PhysicsType = Dust["physicsType" ]

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

    public activate()
    {
        this.active = true;
    }
}