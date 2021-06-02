import { DustBase } from "../Dust";
import { World } from "../World";
import { Liquid } from "./Liquid";
import { Sand } from "./Sand";

export class Gas extends Liquid
{
    public velocity: number = 0;
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

        let dustAbove = world.dust.get(x, y - 1);
        let newX = x;
        let newY = y;
        let shouldInactivate = this.framesSinceLastActivity > 10;

        if (dustAbove === null || (dustAbove.physicsType == "liquid" && this.velocity >= dustAbove.velocity)) {
            // If there is space below the current spec of dust, it should fall
            this.dispersionAmount = Math.max(this.dispersionAmount, -this.velocity * this.dispersionFactor);
            this.framesSinceLastActivity = 0;
            this.velocity -= world.gravity * this.gravityFactor;
            shouldInactivate = false;
        } else {
            // Try to disperse the liquid sideways
            let dispersionResult = this.tryDisperse(world, newX, newY, -1);
            shouldInactivate = shouldInactivate && this.framesSinceLastActivity > 50;
            newX = dispersionResult.x;
            newY = dispersionResult.y;

            if (dispersionResult.x == x) {
                this.velocity = 0;
            }

            this.dispersionAmount = Math.max(20, Math.floor(this.dispersionAmount * 0.9) - 0.5);
        }
        
        if (-this.velocity > this.maxSpeed) {
            this.velocity = -this.maxSpeed;
        }

        // Try to move
        let targetY = Math.ceil(newY + this.velocity - this.ySubPixel);
        this.ySubPixel = targetY - (newY + this.velocity - this.ySubPixel);
        for (let stepY = newY - 1; stepY >= targetY; stepY--) {
            let dustAtPosition = world.dust.get(newX, stepY);
            
            if (this.canMoveInto(dustAtPosition)) {
                newY = stepY;
            } else {
                break;
            }
        }
        
        this.framesSinceLastActivity++;
        if (newY != y) {
            this.framesSinceLastActivity = 0;
            world.dust.getNeighbors(x, y, 2).forEach(dust => dust[0].activate());
        }

        if (shouldInactivate) {
            // Inactivate the dust spec as no further movement will occur
            this.active = false;
        } else {
            // Update the position
            let dustAtTarget = world.dust.get(newX, newY);
            world.dust.set(x, y, dustAtTarget);
            world.dust.set(newX, newY, this);
        }
    }
}