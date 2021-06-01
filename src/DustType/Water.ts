import { Dust } from "../Dust";
import { World } from "../World";

export class Water extends Dust
{
    public velocity: { x: number, y: number } = { x: 0, y: 0 };
    public dispersionFactor = 10;
    public dispersionAmount = 0;

    framesSinceLastActivity = 0;

    constructor() {
        super({
            red: 40,
            blue: 250,
            green: 67
        });
        this.physicsType = "water";
    }

    public step(world: World, x: number, y: number) {
        
        let dustBelow = world.getDust(x, y + 1);
        let newX = x;
        let newY = y;
        let shouldInactivate = this.framesSinceLastActivity > 10;

        if (dustBelow === null || dustBelow === "out-of-bounds" || (dustBelow.physicsType == "water" && this.velocity.y < (dustBelow as Water).velocity.y)) {
            // If there is space below the current spec of dust, it should fall
            this.dispersionAmount = Math.sqrt(this.velocity.y) * this.dispersionFactor;
            this.velocity.y += world.gravity;
            shouldInactivate = false;
        } else {
            // Try to disperse the sand sideways
            let dispersionOrder: ("left" | "right")[] = Math.random() < 0.5 ? ["left", "right"] : ["right", "left"];
            let dispersionResultA = this.tryDisperse(world, newX, newY, dispersionOrder[0]);
            if (dispersionResultA !== null) {
                shouldInactivate = shouldInactivate && this.framesSinceLastActivity > 50;
                newX = dispersionResultA.x;
                newY = dispersionResultA.y;
            } else {
                let dispersionResultB = this.tryDisperse(world, newX, newY, dispersionOrder[1]);
                if (dispersionResultB !== null) {
                shouldInactivate = shouldInactivate && this.framesSinceLastActivity > 50;
                    newX = dispersionResultB.x;
                    newY = dispersionResultB.y;
                } else {
                    this.velocity.y = 0;
                }
            }

            this.dispersionAmount = Math.max(10, this.dispersionAmount * 0.8 - 1);
        }
        
        // Try to move
        let targetX = Math.round(x + this.velocity.x);
        let targetY = Math.round(y + this.velocity.y);
        let steps = this.getPointsTo({ x, y }, { x: targetX, y: targetY });
        for (let i = 1; i < steps.length; i++) {
            let step = steps[i];
            let dustAtPosition = world.getDust(step.x, step.y);
            if (dustAtPosition === "out-of-bounds") {
                // This spec of sand fell out of the world.
                // Just remove it
                world.setDust(x, y, null);
                return;
            }
            
            if (dustAtPosition === null) {
                newX = step.x;
                newY = step.y;
            } else {
                break;
            }
        }
        
        this.framesSinceLastActivity++;
        if (newY != y) {
            this.framesSinceLastActivity = 0;
        }

        if (shouldInactivate) {
            // Inactivate the dust spec as no further movement will occur
            this.active = false;
        } else {
            // Update the position
            world.setDust(x, y, null);
            world.setDust(newX, newY, this);
            world.activateAround(x, y);
        }
    }

    tryDisperse(world: World, x: number, y: number, direction: "left" | "right"): { x: number, y: number, dispersion: number } | null {
        let dir = direction == "left" ? -1 : 1;
        let displacement = 0;
        let dispersionAmount = this.dispersionAmount;
        for (let disp = 1; disp < dispersionAmount; disp++) {
            let dustBeside = world.getDust(x + disp * dir, y);
            if (dustBeside !== null && dustBeside !== "out-of-bounds" && dustBeside.physicsType !== "water") {
                break;
            }

            if (dustBeside === null || dustBeside === "out-of-bounds")
            {
                displacement = disp * dir;
            }

            let dustBelow = world.getDust(x + displacement, y + 1);
            if (dustBelow === null && Math.random() * 5 < dispersionAmount) {
                break;
            }
        }

        if (displacement == 0) {
            return null;
        }

        let dustBelow = world.getDust(x + displacement, y + 1);
        if (dustBelow !== null) {
            return { x: x + displacement, y: y, dispersion: displacement};
        } else {
            return { x: x + displacement, y: y + 1,  dispersion: displacement};
        }
    }
}