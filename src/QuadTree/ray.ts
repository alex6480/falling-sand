import { Vec, AABB, Intersect } from "../Helpers/math";
import DustQuadTree, { DustQuadTreeNode } from "./DustQuadTree";

export default class Ray {
    public origin: Vec;
    public direction: Vec;
    public length?: number;

    public inverseDirection: Vec;

    constructor(origin: Vec, direction: Vec) {
        this.origin = origin;
        this.direction = direction.norm();
        this.inverseDirection = new Vec(1 / this.direction.a, 1 / this.direction.b);
    }

    public IntersectBox (box: AABB): Intersect {
        // Caculate the intersect
        return {
            tMin: Math.max(this.gettx(box.a.a), this.getty(box.a.b)),
            tMax: Math.min(this.gettx(box.b.a), this.getty(box.b.b)),
        }
    }

    public gettx(x: number) {
        return (x - this.origin.a) * this.inverseDirection.a;
    }

    public getty(y: number) {
        return (y - this.origin.b) * this.inverseDirection.b;
    }

    public getPoint(t: number) {
        return this.origin.add(this.direction.multiply(t));
    }

    public intersectQuadTree(tree: DustQuadTree, maxDepth?: number): number | null {
        // Ray mirrored so it enters the box from the top left.
        // This allows implementing code, assuming that this is the case and using a bitmask to get correct code
        const tlRay = new Ray(
        new Vec(this.direction.a < 0 ? -this.origin.a + tree.rootScale : this.origin.a, this.direction.b < 0 ? -this.origin.b + tree.rootScale : this.origin.b),
        new Vec(Math.abs(this.direction.a), Math.abs(this.direction.b)));

        // Bitmask use to fix child indices if ray isn't traveling in +/+ direction
        const childIndexMask = (this.direction.a > 0 ? 0 : 1) + (this.direction.b > 0 ? 0 : 2);
        let stack: QuadTreeStackItem[] = [];

        if (maxDepth === undefined) {
            // If no max depth has been specified, go thorugh the tree to the highest level of detail
            maxDepth = Number.POSITIVE_INFINITY;
        }

        // Push the root node to the stack
        // In a real implementation mayDescend would be determined by whether or not the node has any children
        stack.push({
            index: 0,
            origin: new Vec(0, 0),
            mayDescend: maxDepth > 1,
            quadNode: tree.rootNode
        });

        do {
            const scale = tree.rootScale / Math.pow(2, stack.length - 1);
            const currentNode = stack[stack.length - 1];

            // Check for hit
            if (["solid", "sand"].includes(currentNode.quadNode.physicsType) && (stack.length === maxDepth || ! currentNode.quadNode.isDivided)) {
                // We have a hit.
                const hit = Math.max(tlRay.gettx(currentNode.origin.a), tlRay.getty(currentNode.origin.b));
                if (this.length === undefined || hit > 0) {
                    // If the ray is capped, only return the hit if it is after the origin
                    return hit;
                }
            }

            // Descend to the first child
            if (currentNode.mayDescend && currentNode.quadNode.isDivided) {
                let childIndex = this.getFirstChildIndex(tlRay, currentNode.origin, scale);
                // Since the tree is traversed using a mirrored ray, the actual child index is childIndex ^ childIndexMask
                let childOrigin = this.getChildOrigin(currentNode.origin, scale, childIndex);
                stack.push({
                    index: childIndex,
                    origin: childOrigin,
                    mayDescend: stack.length + 1 < maxDepth,
                    quadNode: currentNode.quadNode.childNodes[childIndex ^ childIndexMask]
                });
            } else {
                // We are at the max depth. Attempt to move on to the adjacent child instead
                const childIndex = this.getNextChildIndex(currentNode.origin, scale, currentNode.index, tlRay);

                if (childIndex !== null) {
                    // Adjacent child was found
                    stack[stack.length - 1] = {
                        index: childIndex,
                        origin: this.getChildOrigin(stack[stack.length - 2].origin, scale * 2, childIndex),
                        mayDescend: stack.length < maxDepth,
                        quadNode: stack[stack.length - 2].quadNode.childNodes[childIndex ^ childIndexMask]
                    };
                } else {
                    // No adjacent child was found.
                    stack.pop();
                    stack[stack.length - 1].mayDescend = false;
                }
            }
        } while (stack.length > 1);

        return Number.POSITIVE_INFINITY;
    }

    /**
     * Gets the index of the first child the ray enters in the quad-node.
     * Assumes that the ray has a x+, y+ direction. Other rays must be mirrored to become x+, y+ and the mask can be used to get the correct result
     * @param ray The ray entering the quad-node. The ray must originate from top left.
     * @param parentNode The parent node
     * @param parentScale The scale of the parent node
     * @param mask If the ray didn't originally come from top left, the mask can be used to get the correct index for the orientaiton
     */
    private getFirstChildIndex(ray: Ray, parentOrigin: Vec, parentScale: number) {
        const tx0 = ray.gettx(parentOrigin.a);
        const tx1 = ray.gettx(parentOrigin.a + parentScale * 0.5);
        const ty0 = ray.getty(parentOrigin.b);
        const ty1 = ray.getty(parentOrigin.b + parentScale * 0.5);

        // The ray enters in one of the top two squares
        // ty1 < tx0 -> The ray enters square 2 (from the left side)
        // tx1 < ty0 -> The ray enters square 1 (from the top side)
        // If neither, the ray enters square 0

        return ((ty1 < tx0 ? 1 : 0) * 2 + (tx1 < ty0 ? 1 : 0));
    }

    private getChildOrigin(parentOrigin: Vec, parentScale: number, childIndex: number) {
        return new Vec(
            (childIndex & 1) * parentScale * 0.5,
            (childIndex & 2) * 0.5 * parentScale * 0.5,
        ).add(parentOrigin);
    }
    
    private getNextChildIndex(currentChildOrigin: Vec, childSize: number, currentChildIndex: number, ray: Ray): number | null {
        // Since it is assumed that the ray moves in the +/+ direction
        // The ray can only exit the current child below or to the right
        const tRight = ray.gettx(currentChildOrigin.a + childSize);
        const tBottom = ray.getty(currentChildOrigin.b + childSize);
    
        const nextChildIndex = currentChildIndex | (tRight < tBottom ? 1 : 2);
        if (nextChildIndex === currentChildIndex) {
            return null;
        }
        return nextChildIndex;
    }
}

type QuadTreeStackItem = {
    index: number,
    origin: Vec,
    mayDescend: boolean,
    quadNode: DustQuadTreeNode
}