import { Dust } from "../Dust";

export class Solid extends Dust
{
    constructor()
    {
        super({
            red: 100,
            blue: 100,
            green: 100
        });
        this.active = false;
    }

    step() {
        this.active = false;
    }
}