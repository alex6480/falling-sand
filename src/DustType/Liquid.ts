import { Dust, DustBase } from "../Dust";
import { World } from "../World";

export class Liquid extends DustBase
{
    public velocity: { x: number, y: number } = { x: 0, y: 0 };
    public dispersionFactor = 5;
    public dispersionAmount = 0;

    public physicsType: "liquid" = "liquid";

    protected framesSinceLastActivity = 0;
    protected ySubPixel: number = 0;

    constructor() {
        super({
            red: 40,
            blue: 250,
            green: 67
        });
    }

    public step(world: World, x: number, y: number) {
        
        let dustBelow = world.getDust(x, y + 1);
        let newX = x;
        let newY = y;
        let shouldInactivate = this.framesSinceLastActivity > 10;

        if (dustBelow === null || (dustBelow.physicsType == "liquid" && this.velocity.y < dustBelow.velocity.y)) {
            // If there is space below the current spec of dust, it should fall
            this.dispersionAmount = Math.max(this.dispersionAmount, this.velocity.y * this.dispersionFactor);
            this.framesSinceLastActivity = 0;
            this.velocity.y += world.gravity;
            shouldInactivate = false;
        } else {
            // Try to disperse the liquid sideways
            let dispersionResult = this.tryDisperse(world, newX, newY);
            shouldInactivate = shouldInactivate && this.framesSinceLastActivity > 50;
            newX = dispersionResult.x;
            newY = dispersionResult.y;

            if (dispersionResult.x == x) {
                this.velocity = { x: 0, y: 0 };
                this.ySubPixel = 0;
            }

            this.dispersionAmount = Math.max(20, Math.floor(this.dispersionAmount * 0.9) - 0.5);
        }
        
        // Try to move
        let targetX = Math.round(newX + this.velocity.x);
        let targetY = Math.ceil(newY + this.velocity.y + this.ySubPixel);
        this.ySubPixel = newY + this.velocity.y + this.ySubPixel - targetY;
        let steps = this.getPointsTo({ x, y }, { x: targetX, y: targetY });
        for (let i = 1; i < steps.length; i++) {
            let step = steps[i];
            let dustAtPosition = world.getDust(step.x, step.y);
            
            if (this.canMoveInto(dustAtPosition)) {
                newX = step.x;
                newY = step.y;
            } else {
                break;
            }
        }
        
        this.framesSinceLastActivity++;
        if (newY != y) {
            this.framesSinceLastActivity = 0;
            world.getNeighbors(x, y, 2).forEach(dust => dust[0].activate());
        }

        if (shouldInactivate) {
            // Inactivate the dust spec as no further movement will occur
            this.active = false;
        } else {
            // Update the position
            let dustAtTarget = world.getDust(newX, newY);
            world.setDust(x, y, dustAtTarget);
            world.setDust(newX, newY, this);
        }
    }

    public activate() {
        super.activate();
        this.framesSinceLastActivity = 0;
    }

    protected tryDisperse(world: World, x: number, y: number, yDirection: (-1 | 1) = 1): { x: number, y: number, dispersion: number } {
        let directions = Math.random() < 0.5 ? [-1, 1] : [1, -1];
        let distance = 1;

        if (this.dispersionAmount == 0) {
            return { x: x, y: y, dispersion: 0};
        }

        while (true) {
            let possibleDirections = directions;
            for (let i = 0; i < directions.length; i++)
            {
                let dir = directions[i];
                let dustAtPosition = world.getDust(x + dir * distance, y);
                let dustBelow = world.getDust(x + dir * distance, y + yDirection);

                if (this.canMoveInto(dustAtPosition) || dustAtPosition.physicsType === "liquid") {
                    // We can move into this space
                    // There is a random chance that we don't move any further
                    let random = Math.random();
                    if (this.canMoveInto(dustBelow) && random < 0.5 || random < 1 / this.dispersionAmount) {
                        if (dustAtPosition !== null && dustAtPosition.physicsType === "liquid") {
                            // We dispersed into another water element, so just stop dispersing
                            return { x, y, dispersion: 0 };
                        }

                        if (this.canMoveInto(dustBelow)) {
                            return { x: x + distance * dir, y: y + yDirection, dispersion: distance };
                        } else {
                            return { x: x + distance * dir, y: y, dispersion: distance };
                        }
                    }
                } else {
                    // It is not possible to advance in this direction
                    if (possibleDirections.length === 2) {
                        // Keep on searching in the other direction
                        possibleDirections = [-dir];
                        continue;
                    } else {
                        // We cannot move any further in any direction
                        return { x: x + (distance - 1) * dir, y: y, dispersion: (distance - 1)};
                    }
                }
            }
            
            directions = possibleDirections;
            distance = distance + 1;
        }
    }

    protected canMoveInto(space: null | Dust) {
        return space === null;
    }
}