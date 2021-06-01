import { Dust } from "../Dust";
import { World } from "../World";

export class Sand extends Dust
{
    public velocity: { x: number, y: number } = { x: 0, y: 0 };
    public dispersionFactor = 10;
    public dispersionAmount = 0;
    public dispersionDistance = 1;

    constructor() {
        super({
            red: 230,
            blue: 10,
            green: 220
        });
        this.physicsType = "sand";
    }

    public step(world: World, x: number, y: number) {
        
        let dustBelow = world.getDust(x, y + 1);
        let newX = x;
        let newY = y;

        if (dustBelow === null || dustBelow === "out-of-bounds" || (dustBelow.physicsType == "sand" && this.velocity.y < (dustBelow as Sand).velocity.y)) {
            // If there is space below the current spec of dust, it should fall
            //this.velocity.y = Math.max(this.velocity.y, this.dispersionAmount / Math.max(1, this.dispersionFactor));
            this.dispersionAmount = Math.sqrt(this.velocity.y) * this.dispersionFactor;
            this.velocity.y += world.gravity;
        } else {
            // Try to disperse the sand sideways
            let dispersionResultLeft = this.tryDisperse(world, newX, newY, "left");
            if (dispersionResultLeft !== null) {
                newX = dispersionResultLeft.x;
                newY = dispersionResultLeft.y;
            } else {
                let dispersionResultRight = this.tryDisperse(world, newX, newY, "right");
                if (dispersionResultRight !== null) {
                    newX = dispersionResultRight.x;
                    newY = dispersionResultRight.y;
                } else {
                    this.velocity.y = 0;
                    this.dispersionAmount = 0;
                }
            }

            this.dispersionAmount = Math.max(0, this.dispersionAmount * 0.8 - 1);
        }
        
        // Try to move
        let targetX = Math.ceil(x + this.velocity.x);
        let targetY = Math.ceil(y + this.velocity.y);
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
        
        if (newX == x && newY == y && this.velocity.y == 0 && this.dispersionAmount == 0) {
            // Inactivate the dust spec as no further movement will occur
            this.active = false;
        } else {
            // Update the position
            world.setDust(x, y, null);
            world.setDust(newX, newY, this);
            // Agitate neighbors
            world.getNeighbors(x, y, this.dispersionDistance)
                .filter(dust => dust[0].physicsType == "sand")
                .forEach(dust => {
                    (dust[0] as Sand).dispersionAmount = Math.max((dust[0] as Sand).dispersionAmount, Math.max(0, this.dispersionAmount - Math.sqrt(dust[1])));
                    dust[0].active = true;
                });
        }
    }

    tryDisperse(world: World, x: number, y: number, direction: "left" | "right"): { x: number, y: number, dispersion: number } | null {
        let dir = direction == "left" ? -1 : 1;
        let displacement = 0;
        for (let disp = 1; disp < this.dispersionAmount; disp++) {
            let dustBeside = world.getDust(x + disp * dir, y);
            if (dustBeside !== null && dustBeside !== "out-of-bounds") {
                break;
            }

            displacement = disp * dir;

            let dustBelow = world.getDust(x + displacement, y + 1);
            if (dustBelow === null && Math.random() * 5 < this.dispersionAmount) {
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