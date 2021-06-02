import { Dust, DustBase } from "./Dust";
import { Solid } from "./DustType/Solid";
import DustQuadTree, { QuadTreePhysicsType } from "./QuadTree/DustQuadTree";

export class World
{
    public readonly gravity: number = 0.1;
    public readonly dust: DustMap;

    public get width() { return this.dust.width; }
    public get height() { return this.dust.height; }

    public frame = 0;

    constructor(width: number, height: number)
    {
        this.dust = new DustMap(width, height);
        this.frame = 0;

        // Create a floor
        for (let y = Math.floor(height * 0.9); y < height; y++)
        {
            for (let x = 0; x < width; x++)
            {
                this.dust.set(x, y, new Solid());
            }
        }
    }

    public step()
    {
        let xStepDirection = this.frame % 2 === 0 ? -1 : 1;
        let activeCount = 0;
        for (let y = this.height - 1; y >= 0; y--)
        {
            let layerActive = false;
            for (let i = 0; i < this.width; i++)
            {
                let x = xStepDirection == 1 ? i : this.width - 1 - i;
                let dust = this.dust.get(x, y);
                if (dust !== null && dust.active)
                {
                    activeCount++;
                    layerActive = true;
                    dust.step(this, x, y);
                }
            }
        }

        this.frame = this.frame + 1;
        this.dust.rebuildQuadTree();
    }
}

export class DustMap {
    public readonly data: (Dust | null)[];

    public readonly width: number;
    public readonly height: number;
    public readonly imageData: ImageData;
    public readonly quadTree: DustQuadTree;

    // Keep track of every time a physics type was changed since the quad tree was last rebuild
    private physicsTypeChanges: { [key: number]: [QuadTreePhysicsType, QuadTreePhysicsType] } = {};

    constructor(width: number, height: number)
    {
        this.width = width;
        this.height = height;
        this.data = Array(width * height).fill(null);
        this.imageData = new ImageData(this.width, this.height);
        this.renderAll();
        this.quadTree = new DustQuadTree(20, width, height);
        this.quadTree.build(this);
    }

    public renderDust(index: number, red: number, green: number, blue: number) {
        this.imageData.data[index * 4] = red;
        this.imageData.data[index * 4 + 1] = green;
        this.imageData.data[index * 4 + 2] = blue;
        this.imageData.data[index * 4 + 3] = 255;
    }

    public get(x: number, y: number): Dust | null
    {
        if (x < 0 || y < 0 || x >= this.width || y >= this.width)
        {
            return null;
        }
        return this.data[this.getDustIndex(x, y)];
    }

    public set(x: number, y: number, dust: Dust)
    {
        if (x < 0 || y < 0 || x >= this.width || y >= this.width)
        {
            return;
        }

        let index = this.getDustIndex(x, y);

        // Register the change to the quad tree
        if (this.physicsTypeChanges[index] === undefined) {
            this.physicsTypeChanges[index] = [this.data[index] === null ? "nothing" : this.data[index].physicsType, dust === null ? "nothing" : dust.physicsType];
        } else {
            this.physicsTypeChanges[index] = [this.physicsTypeChanges[index][0], dust === null ? "nothing" : dust.physicsType];
            if (this.physicsTypeChanges[index][0] === this.physicsTypeChanges[index][1]) {
                delete this.physicsTypeChanges[index];
            }
        }

        // Update the map data
        this.data[index] = dust;

        // Render the updated dust to the texture
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

    private renderAll()
    {
        for (let i = 0; i < this.width * this.height; i++)
        {
            if (this.data[i] === null) {
                this.renderDust(i, 255, 255, 255);
            } else {
                this.data[i].render((red: number, green: number, blue: number) => this.renderDust(i, red, green, blue));
            }
        }
    }

    public fillCircle(center: { x: number, y: number }, radius: number, getDust: (x: number, y: number) => Dust | null)
    {
        center = { x: Math.floor(center.x), y: Math.floor(center.y) }

        if (radius == 0) {
            this.set(center.x, center.y, getDust(center.x, center.y));
            return;
        }

        for (let x = Math.max(center.x - radius, 0); x < center.x + radius * 2 && x < this.width; x++)
        {
            for (let y = Math.max(center.y - radius, 0); y < center.y + radius * 2 && y < this.height; y++)
            {
                if ((x - center.x) * (x - center.x) + (y - center.y) * (y - center.y) <= radius * radius)
                {
                    let previousDust = this.get(x, y);
                    let newDust = getDust(x, y);

                    if (newDust === null || previousDust === null || newDust.physicsType !== previousDust.physicsType) {
                        this.set(x, y, newDust);
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

                let dust = this.get(x1, y1);
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

    public rebuildQuadTree() {
        let changedIndeces = Object.keys(this.physicsTypeChanges);
        for (let i = 0; i < changedIndeces.length && i < 50; i++) {
            let index = Number(changedIndeces[i]);
            let from = this.physicsTypeChanges[index][0];
            let to = this.physicsTypeChanges[index][1];
            delete this.physicsTypeChanges[index];

            if (from !== to) {
                let x = index % this.width;
                let y = (index - x) / this.width;
                this.quadTree.replace(x, y, from, to);
            }
        }
    }
}