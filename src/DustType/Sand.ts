import { Dust, DustBase } from "../Dust";
import { World } from "../World";

export class Sand extends DustBase
{
    public velocity: number = 0;
    public dispersionFactor = 2;
    public dispersionAmount = 0;
    public dispersionDistance = 1;

    public physicsType: "sand" = "sand";
    private ySubPixel: number = 0;

    constructor() {
        super({
            red: 230,
            blue: 10,
            green: 220
        });
    }

    public step(world: World, x: number, y: number) {
        
        let dustBelow = world.dust.get(x, y + 1);
        let newX = x;
        let newY = y;

        if (dustBelow === null || (dustBelow.physicsType == "sand" && this.velocity < dustBelow.velocity)) {
            // If there is space below the current spec of dust, it should fall
            //this.velocity.y = Math.max(this.velocity.y, this.dispersionAmount / Math.max(1, this.dispersionFactor));
            this.dispersionAmount = Math.max(this.dispersionAmount, Math.max(Math.random() * 2, this.velocity * this.velocity) * this.dispersionFactor);
            this.velocity += world.gravity;
        } else if (dustBelow.physicsType === "liquid") {
            this.velocity += world.gravity;
            this.velocity *= 0.5;
            this.dispersionAmount = Math.max(this.dispersionAmount, Math.sqrt(Math.max(Math.random(), this.velocity)) * this.dispersionFactor);
        } else {
            // Try to disperse the sand sideways
            let dispersionResult = this.tryDisperse(world, newX, newY);
            if (dispersionResult !== null) {
                newX = dispersionResult.x;
                newY = dispersionResult.y;

                if (dispersionResult.x == x) {
                    this.velocity = 0;
                    this.dispersionAmount = 0;
                }
            }
            this.dispersionAmount = Math.max(0, Math.floor(this.dispersionAmount * 0.5 - 5));
            this.ySubPixel = 0;
        }
        
        // Try to move
        let targetY = Math.ceil(newY + this.velocity + this.ySubPixel);
        this.ySubPixel = newY + this.velocity + this.ySubPixel - targetY;

        for (let stepY = newY + 1; stepY <= targetY; stepY++) {
            let dustAtPosition = world.dust.get(newX, stepY);
            
            if (this.canMoveInto(dustAtPosition)) {
                newY = stepY;
            } else {
                break;
            }
        }
        
        if (newX == x && newY == y && this.velocity == 0 && this.dispersionAmount == 0) {
            // Inactivate the dust spec as no further movement will occur
            this.active = false;
        } else {
            // Update the position
            let dustAtTarget = world.dust.get(newX, newY);
            dustAtTarget?.activate();
            world.dust.set(x, y, dustAtTarget);
            world.dust.set(newX, newY, this);

            // Agitate neighbors
            world.dust.getNeighbors(x, y, this.dispersionDistance)
                .forEach(dust => {
                    if (dust[0].physicsType == "sand") {
                        dust[0].dispersionAmount = Math.max(dust[0].dispersionAmount, Math.max(0, this.dispersionAmount * 0.8 - dust[1]));
                    }
                    dust[0].activate();
                });
        }
    }

    tryDisperse(world: World, x: number, y: number): { x: number, y: number, dispersion: number } {
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
                let dustAtPosition = world.dust.get(x + dir * distance, y);
                let dustBelow = world.dust.get(x + dir * distance, y + 1);

                if (this.canMoveInto(dustAtPosition)) {
                    // We can move into this space
                    // There is a random chance that we don't move any further
                    let random = Math.random();
                    if (this.canMoveInto(dustBelow) && random < 0.5 || random < distance / this.dispersionAmount) {
                        if (this.canMoveInto(dustBelow)) {
                            return { x: x + distance * dir, y: y + 1, dispersion: distance};
                        } else {
                            return { x: x + distance * dir, y: y, dispersion: distance};
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

    canMoveInto(space: null | Dust) {
        return space === null || space.physicsType === "liquid";
    }
}