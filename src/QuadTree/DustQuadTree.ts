import { Dust, PhysicsType } from "../Dust";
import { DustMap } from "../World";
import { QuadTreeNode } from "./QuadTree";

export type QuadTreePhysicsType = PhysicsType | "nothing";

export default class DustQuadTree {
    public originX: number = 0;
    public originY: number = 0;
    public rootNode: DustQuadTreeNode;
    public maxDepth: number;
    public rootScale: number;

    constructor (maxDepth: number, width: number, height: number) {
        this.maxDepth = maxDepth;

        // Use the smalles power of two which covers the entire dust map as the root scale
        this.rootScale = Math.pow(2, Math.ceil(Math.log2(Math.max(width, height))));
    }

    public build(dust: DustMap) {
        this.rootNode = new DustQuadTreeNode();
        this.rootNode.build(dust, this.originX, this.originY, this.rootScale, 0, this.maxDepth);
    }

    public replace(x: number, y: number, previousPhysicsType: QuadTreePhysicsType, newPhysicsType: QuadTreePhysicsType) {
        this.rootNode.replace(x, y, previousPhysicsType, newPhysicsType, this.originX, this.originY, this.rootScale, 0, this.maxDepth);
    }

    public render(ctx: CanvasRenderingContext2D, scale: number) {
        this.rootNode.render(ctx, this.originX, this.originY, this.rootScale * scale);
    }
}

export class DustQuadTreeNode {
    public physicsType: QuadTreePhysicsType;
    public containedPhysicsTypes: { [physicsType: string]: number } = {};

    public childNodes?: DustQuadTreeNode[];

    get isDivided(): boolean {
        return this.childNodes !== undefined;
    }

    public render(ctx: CanvasRenderingContext2D, originX: number, originY: number, scale: number) {
        ctx.strokeStyle = ["solid", "sand"].includes(this.physicsType) ? "red" : "black";
        ctx.lineWidth = 1;

        ctx.strokeRect(originX, originY, scale, scale);

        if (this.isDivided) {
            const childScale = scale * 0.5;
            this.childNodes[0].render(ctx, originX, originY, childScale);
            this.childNodes[1].render(ctx, originX + childScale, originY, childScale);
            this.childNodes[2].render(ctx, originX, originY + childScale, childScale);
            this.childNodes[3].render(ctx, originX + childScale, originY + childScale, childScale);
        }
    }

    public replace(x: number, y: number, previousPhysicsType: QuadTreePhysicsType, newPhysicsType: QuadTreePhysicsType, 
        originX: number, originY: number, scale:number, depth: number, maxDepth: number) {
        
        const childScale = scale * 0.5;
        
        // Subtract the old physics type
        this.containedPhysicsTypes[previousPhysicsType] -= 1;
        if (this.containedPhysicsTypes[previousPhysicsType] === 0) {
            delete this.containedPhysicsTypes[previousPhysicsType];
        }
        
        // Add the new physics type
        if (this.containedPhysicsTypes[newPhysicsType] === undefined) {
            this.containedPhysicsTypes[newPhysicsType] = 1;
        } else {
            this.containedPhysicsTypes[newPhysicsType] += 1;
        }

        if (Object.keys(this.containedPhysicsTypes).length === 1) {
            // Only one physics type was found
            this.physicsType = Object.keys(this.containedPhysicsTypes)[0] as QuadTreePhysicsType;
            if (this.isDivided) {
                // Remove the child nodes as there is no longer a need for this node to be divided
                this.childNodes = undefined;
            }
            return;
        } else {
            // Calculate the most common physics type in the node
            let mostCommonPhysicsType = Object.keys(this.containedPhysicsTypes).reduce((a, b) => this.containedPhysicsTypes[a] > this.containedPhysicsTypes[b] ? a : b);
            if (! this.isDivided && depth < maxDepth) {
                // Divide the node, if possible
                this.childNodes = [];
                this.childNodes.push(new DustQuadTreeNode());
                this.childNodes.push(new DustQuadTreeNode());
                this.childNodes.push(new DustQuadTreeNode());
                this.childNodes.push(new DustQuadTreeNode());
                // If a node has been divided, it means it was previously only a single physics type
                // We can therefore prefill the nodes with the correct types
                this.childNodes[0].containedPhysicsTypes = { [this.physicsType]: childScale * childScale };
                this.childNodes[0].physicsType = this.physicsType;
                this.childNodes[1].containedPhysicsTypes = { [this.physicsType]: childScale * childScale };
                this.childNodes[1].physicsType = this.physicsType;
                this.childNodes[2].containedPhysicsTypes = { [this.physicsType]: childScale * childScale };
                this.childNodes[2].physicsType = this.physicsType;
                this.childNodes[3].containedPhysicsTypes = { [this.physicsType]: childScale * childScale };
                this.childNodes[3].physicsType = this.physicsType;
            }

            this.physicsType = mostCommonPhysicsType as QuadTreePhysicsType;
            if (this.isDivided) {
                // Insert the dust particle into the correct child node
                let dx = x < originX + childScale ? 0 : 1;
                let dy = y < originY + childScale ? 0 : 1;
                let childNode = this.childNodes[dx + 2 * dy];
                childNode.replace(x, y, previousPhysicsType, newPhysicsType, originX + dx * childScale, originY + dy * childScale, childScale, depth + 1, maxDepth);
            }
        }
    }

    public build(data: DustMap, originX: number, originY: number, scale: number, depth: number, maxDepth: number) {
        this.containedPhysicsTypes = {};

        // Count all the physics types contained in this node
        for (let x = originX; x < originX + scale; x++) {
            for (let y = originY; y < originY + scale; y++) {
                if (depth === maxDepth) debugger;

                let dust = data.get(x, y);
                let physicsType = dust === null ? "nothing" : dust.physicsType;

                if (this.containedPhysicsTypes[physicsType] === undefined) {
                    this.containedPhysicsTypes[physicsType] = 1;
                } else {
                    this.containedPhysicsTypes[physicsType] += 1;
                }
            }
        }

        if (Object.keys(this.containedPhysicsTypes).length === 1) {
            // Only one physics type was found
            this.physicsType = Object.keys(this.containedPhysicsTypes)[0] as QuadTreePhysicsType;
            return;
        } else {
            // Both where found
            // Define the physics type as the most common
            let mostCommonPhysicsType = Object.keys(this.containedPhysicsTypes).reduce((a, b) => this.containedPhysicsTypes[a] > this.containedPhysicsTypes[b] ? a : b);
            this.physicsType = mostCommonPhysicsType as QuadTreePhysicsType;
            if (depth < maxDepth) {
                // Divide the node, if possible
                const childScale = scale * 0.5;
                this.childNodes = [];
                this.childNodes.push(this.buildChild(data, originX, originY,                           depth + 1, childScale, maxDepth));
                this.childNodes.push(this.buildChild(data, originX + childScale, originY,              depth + 1, childScale, maxDepth));
                this.childNodes.push(this.buildChild(data, originX, originY + childScale,              depth + 1, childScale, maxDepth));
                this.childNodes.push(this.buildChild(data, originX + childScale, originY + childScale, depth + 1, childScale, maxDepth));
            }
        }
    }

    private buildChild(data: DustMap, originX: number, originY: number, depth: number, scale: number, maxDepth: number): DustQuadTreeNode {
        const child = new DustQuadTreeNode();
        child.build(data, originX, originY, scale, depth, maxDepth);
        return child;
    }
}