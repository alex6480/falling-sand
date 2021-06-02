import { AABB, Vec } from "../Helpers/math";

export class QuadTreeNode {
    public items: IQuadTreeItem[] = [];
    public childNodes?: QuadTreeNode[];

    get isDivided(): boolean {
        return this.childNodes !== undefined;
    }

    public addItem(item: IQuadTreeItem, origin: Vec, depth: number, scale: number, maxDepth: number, maxChildrenPerNode: number) {
        if (this.items.length < maxChildrenPerNode) {
            // There is vacant space in this node
            this.items.push(item);
            return;
        } else if (depth === maxDepth) {
            // This node is at max depth and cannot be divided
            this.items.push(item);
            return;
        } else {
            // Calculate whether this item can be inserted into the tree at this level or not
            const childScale = scale * 0.5;
            if (item.boundingBox.a.a % childScale + item.boundingBox.b.a - item.boundingBox.a.a > childScale ||
                item.boundingBox.a.b % childScale + item.boundingBox.b.b - item.boundingBox.a.b > childScale) {
                // This item is too big to be inserted into a child
                this.items.push(item);
                return;
            } else {
                // Check if the node needs to be divided
                if (! this.isDivided) {
                    this.childNodes = [];
                    for (let i = 0; i < 4; i++) {
                        const child = new QuadTreeNode();
                        this.childNodes.push(child);
                    }
                }

                // Calculate the index of the child this item will be added to
                const xPos = (item.boundingBox.a.a % scale > childScale ? 1 : 0);
                const yPos = (item.boundingBox.a.b % scale > childScale ? 1 : 0);
                const childIndex = yPos * 2 + xPos;
                this.childNodes[childIndex].addItem(item, origin.add(new Vec(xPos, yPos).multiply(childScale)), depth + 1, childScale, maxDepth, maxChildrenPerNode);
                return;
            }
        }
    }

    public render(ctx: CanvasRenderingContext2D, origin: Vec, scale: number) {
        ctx.strokeStyle = this.items.length > 0 ? "red" : "black";
        ctx.strokeRect(origin.a, origin.b, scale, scale);

        /* if (this.isDivided) {
            const childScale = scale * 0.5;
            this.childNodes[0].render(ctx, origin, childScale);
            this.childNodes[1].render(ctx, origin.add(new Vec(childScale, 0)), childScale);
            this.childNodes[2].render(ctx, origin.add(new Vec(0, childScale)), childScale);
            this.childNodes[3].render(ctx, origin.addScalar(childScale), childScale);
        } */
    }
}

export default class QuadTree extends QuadTreeNode {
    public maxDepth: number;
    public maxChildrenPerNode: number;
    public origin: Vec;
    public rootScale: number;
    public items: IQuadTreeItem[] = [];

    public addItem(item: IQuadTreeItem) {
        super.addItem(item, this.origin, 0, this.rootScale, this.maxDepth, this.maxChildrenPerNode);
    }

    public render(ctx: CanvasRenderingContext2D) {
        super.render(ctx, this.origin, this.rootScale);
    }
}

export class IQuadTreeItem {
    public boundingBox: AABB
}