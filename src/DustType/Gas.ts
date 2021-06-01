import { DustBase } from "../Dust";
import { World } from "../World";
import { Liquid } from "./Liquid";
import { Sand } from "./Sand";

export class Gas extends Liquid
{
    public velocity: { x: number, y: number } = { x: 0, y: 0 };
    public gravityFactor = 0.5;
    public maxSpeed = 1;
    private lastFrame = 0;

    constructor() {
        super();
        this.color = {
            red: 180,
            blue: 170,
            green: 30
        };
        this.dispersionAmount = 1;
    }

    public step(world: World, x: number, y: number) {
        
        if (world.frame <= this.lastFrame) {
            return;
        }
        this.lastFrame = world.frame;

        let dustAbove = world.getDust(x, y - 1);
        let newX = x;
        let newY = y;
        let shouldInactivate = this.framesSinceLastActivity > 10;

        if (dustAbove === null || (dustAbove.physicsType == "liquid" && this.velocity.y >= dustAbove.velocity.y)) {
            // If there is space below the current spec of dust, it should fall
            this.dispersionAmount = Math.max(this.dispersionAmount, -this.velocity.y * this.dispersionFactor);
            this.framesSinceLastActivity = 0;
            this.velocity.y -= world.gravity * this.gravityFactor;
            shouldInactivate = false;
        } else {
            // Try to disperse the liquid sideways
            let dispersionResult = this.tryDisperse(world, newX, newY, -1);
            shouldInactivate = shouldInactivate && this.framesSinceLastActivity > 50;
            newX = dispersionResult.x;
            newY = dispersionResult.y;

            if (dispersionResult.x == x) {
                this.velocity = { x: 0, y: 0 };
            }

            this.dispersionAmount = Math.max(20, Math.floor(this.dispersionAmount * 0.9) - 0.5);
        }
        
        if (-this.velocity.y > this.maxSpeed) {
            this.velocity.y = -this.maxSpeed;
        }

        // Try to move
        let targetX = Math.round(newX + this.velocity.x);
        let targetY = Math.ceil(newY + this.velocity.y - this.ySubPixel);
        this.ySubPixel = targetY - (newY + this.velocity.y - this.ySubPixel);
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
}