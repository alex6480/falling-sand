import { Dust, DustBase } from "./Dust";
import { Solid } from "./DustType/Solid";

export class World
{
    public readonly width: number;
    public readonly height: number;
    public readonly dust: (Dust | null)[];
    public readonly gravity: number = 0.1;
    public imageData: ImageData;

    private _xStepDirection: -1 | 1 = -1;

    constructor(width: number, height: number)
    {
        this.width = width;
        this.height = height;
        this.dust = Array(width * height).fill(null);
        this.imageData = new ImageData(this.width, this.height);

        // Create a floor
        for (let y = Math.floor(height * 0.9); y < height; y++)
        {
            for (let x = 0; x < width; x++)
            {
                this.dust[this.getDustIndex(x, y)] = new Solid();
            }
        }
        this.renderAll();
    }

    private renderAll()
    {
        for (let i = 0; i < this.width * this.height; i++)
        {
            if (this.dust[i] === null) {
                this.renderDust(i, 255, 255, 255);
            } else {
                this.dust[i].render((red: number, green: number, blue: number) => this.renderDust(i, red, green, blue));
            }
        }
    }

    public step()
    {
        this._xStepDirection = -this._xStepDirection as (-1 | 1);
        let activeCount = 0;
        for (let y = this.height - 1; y >= 0; y--)
        {
            let layerActive = false;
            for (let i = 0; i < this.width; i++)
            {
                let x = this._xStepDirection == 1 ? i : this.width - 1 - i;
                let dust = this.dust[this.getDustIndex(x, y)];
                if (dust !== null && dust.active)
                {
                    activeCount++;
                    layerActive = true;
                    dust.step(this, x, y);
                }
            }

            if (layerActive) {
                let a = "test"; // Allow for breakpoints here
            }
        }

        if (this._xStepDirection == -1) console.log("Active: ", activeCount);
    }

    public getDust(x: number, y: number): Dust | null
    {
        if (x < 0 || y < 0 || x >= this.width || y >= this.width)
        {
            return null;
        }
        return this.dust[this.getDustIndex(x, y)];
    }

    public setDust(x: number, y: number, dust: Dust)
    {
        if (x < 0 || y < 0 || x >= this.width || y >= this.width)
        {
            return;
        }

        let index = this.getDustIndex(x, y);
        this.dust[index] = dust;
        if (dust !== null) {
            dust.render((red: number, green: number, blue: number) => this.renderDust(index, red, green, blue));
        } else {
            this.renderDust(index, 255, 255, 255);
        }
    }

    public getDustIndex(x: number, y: number)
    {
        return y * this.width + x;
    }

    public renderDust(index: number, red: number, green: number, blue: number) {
        this.imageData.data[index * 4] = red;
        this.imageData.data[index * 4 + 1] = green;
        this.imageData.data[index * 4 + 2] = blue;
        this.imageData.data[index * 4 + 3] = 255;
    }

    public fillCircle(center: { x: number, y: number }, radius: number, getDust: (x: number, y: number) => Dust | null)
    {
        center = { x: Math.floor(center.x), y: Math.floor(center.y) }

        if (radius == 0) {
            this.setDust(center.x, center.y, getDust(center.x, center.y));
            return;
        }

        for (let x = Math.max(center.x - radius, 0); x < center.x + radius * 2 && x < this.width; x++)
        {
            for (let y = Math.max(center.y - radius, 0); y < center.y + radius * 2 && y < this.height; y++)
            {
                if ((x - center.x) * (x - center.x) + (y - center.y) * (y - center.y) <= radius * radius)
                {
                    let previousDust = this.getDust(x, y);
                    let newDust = getDust(x, y);

                    if (newDust === null || previousDust === null || newDust.physicsType !== previousDust.physicsType) {
                        this.setDust(x, y, newDust);
                        this.activateAround(x, y);
                    }
                }
            }
        }
    }

    public getNeighbors(x: number, y: number, distance: number = 1): [Dust, number][] {
        let result: [Dust, number][] = [];
        for (let x1 = x - distance; x1 <= x + distance; x1++) {
            for (let y1 = y - distance; y1 <= y + distance; y1++) {
                // Don't activate the tile itself
                if (x1 == x && y1 == y) continue;

                let dust = this.getDust(x1, y1);
                if (dust != null)
                {
                    result.push([dust, (x - x1) * (x - x1) + (y - y1) * (y - y1)]);
                }
            }
        }
        return result;
    }

    public activateAround(x: number, y: number) {
        this.getNeighbors(x, y).forEach(dust => dust[0].activate());
    }
}