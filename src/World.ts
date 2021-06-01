import { Dust } from "./Dust";
import { Solid } from "./DustType/Solid";

export class World
{
    public readonly width: number;
    public readonly height: number;
    public readonly dust: (Dust | null)[];
    public readonly gravity: number = 0.1;

    public scale: number = 1;
    public ctx: CanvasRenderingContext2D;

    xStepDirection: -1 | 1 = -1;

    constructor(ctx: CanvasRenderingContext2D, scale: number, width: number, height: number)
    {
        this.width = width;
        this.height = height;
        this.ctx = ctx;
        this.scale = scale;

        this.dust = Array(width * height).fill(null);

        // Create a floor
        for (let y = Math.floor(height * 0.9); y < height; y++)
        {
            for (let x = 0; x < width; x++)
            {
                this.dust[this.getDustIndex(x, y)] = new Solid();
            }
        }
    }

    public renderAll()
    {
        this.ctx.clearRect(0, 0, this.width * this.scale, this.height * this.scale);
        for (let i = 0; i < this.width * this.height; i++)
        {
            if (this.dust[i] === null) {
                continue;
            }

            let x = i % this.width;
            let y = (i - x) / this.width;
            this.dust[i].render(this.ctx, this.scale, x, y);
        }
    }

    public step()
    {
        this.xStepDirection = -this.xStepDirection as (-1 | 1);
        let activeCount = 0;
        for (let y = this.height - 1; y >= 0; y--)
        {
            let layerActive = false;
            for (let i = 0; i < this.width; i++)
            {
                let x = this.xStepDirection == 1 ? i : this.width - 1 - i;
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

        console.log("Active: ", activeCount);
    }

    public getDust(x: number, y: number): Dust | null | "out-of-bounds"
    {
        if (x < 0 || y < 0 || x >= this.width || y >= this.width)
        {
            return "out-of-bounds";
        }
        return this.dust[this.getDustIndex(x, y)];
    }

    public setDust(x: number, y: number, dust: Dust)
    {
        if (x < 0 || y < 0 || x >= this.width || y >= this.width)
        {
            return;
        }
        this.dust[this.getDustIndex(x, y)] = dust;
        this.clearDust(x, y);
        if (dust !== null)
        {
            dust.render(this.ctx, this.scale, x, y);
        }
    }

    public getDustIndex(x: number, y: number)
    {
        return y * this.width + x;
    }

    public clearDust(x: number, y: number)
    {
        this.ctx.clearRect(x * this.scale, y * this.scale, this.scale, this.scale);
    }

    public fillCircle(center: { x: number, y: number }, radius: number, getDust: (x: number, y: number) => Dust | null)
    {
        center = { x: Math.floor(center.x), y: Math.floor(center.y) }
        for (let x = Math.max(center.x - radius, 0); x < center.x + radius * 2 && x < this.width; x++)
        {
            for (let y = Math.max(center.y - radius, 0); y < center.y + radius * 2 && y < this.height; y++)
            {
                if ((x - center.x) * (x - center.x) + (y - center.y) * (y - center.y) <= radius * radius)
                {
                    let previousDust = this.getDust(x, y);
                    let newDust = getDust(x, y);
                    this.activateAround(x, y);

                    if (previousDust === null || previousDust === "out-of-bounds" || newDust === null || previousDust.physicsType !== newDust.physicsType)
                    {
                        this.dust[this.getDustIndex(x, y)] = newDust;
                        if (newDust !== null)
                        {
                            newDust.render(this.ctx, this.scale, x, y);
                        }
                        else
                        {
                            this.clearDust(x, y);
                        }
                    }
                }
            }
        }
    }

    public getNeighbors(x: number, y: number, distance: number = 1): [Dust, number][] {
        let result: [Dust, number][] = [];
        for (let x1 = x - distance; x1 <= x + distance; x1++) {
            for (let y1 = y - distance; y1 <= y + distance; y1++) {
                let dust = this.getDust(x1, y1);
                if (dust != null && dust !== "out-of-bounds")
                {
                    result.push([dust, (x - x1) * (x - x1) + (y - y1) * (y - y1)]);
                }
            }
        }
        return result;
    }

    public activateAround(x: number, y: number) {
        this.getNeighbors(x, y).forEach(dust => dust[0].active = true);
    }
}