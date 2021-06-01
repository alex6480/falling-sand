import { Dust, DustBase } from "../Dust";
import { World } from "../World";

export class Sand extends DustBase
{
    public velocity: { x: number, y: number } = { x: 0, y: 0 };
    public dispersionFactor = 2;
    public dispersionAmount = 0;
    public dispersionDistance = 2;

    public physicsType: "sand" = "sand";

    constructor() {
        super({
            red: 230,
            blue: 10,
            green: 220
        });
    }

    public step(world: World, x: number, y: number) {
        
        let dustBelow = world.getDust(x, y + 1);
        let newX = x;
        let newY = y;

        if (dustBelow === null || (dustBelow.physicsType == "sand" && this.velocity.y < dustBelow.velocity.y)) {
            // If there is space below the current spec of dust, it should fall
            //this.velocity.y = Math.max(this.velocity.y, this.dispersionAmount / Math.max(1, this.dispersionFactor));
            this.dispersionAmount = Math.max(this.dispersionAmount, Math.max(Math.random() * 2, this.velocity.y * this.velocity.y) * this.dispersionFactor);
            this.velocity.y += world.gravity;
        } else if (dustBelow.physicsType === "liquid") {
            this.velocity.y += world.gravity;
            this.velocity.y *= 0.5;
            this.dispersionAmount = Math.max(this.dispersionAmount, Math.sqrt(Math.max(Math.random(), this.velocity.y)) * this.dispersionFactor);
        } else {
            // Try to disperse the sand sideways
            let dispersionResult = this.tryDisperse(world, newX, newY);
            if (dispersionResult !== null) {
                newX = dispersionResult.x;
                newY = dispersionResult.y;

                if (dispersionResult.x == x) {
                    this.velocity = { x: 0, y: 0 };
                    this.dispersionAmount = 0;
                }
            }
            this.dispersionAmount = Math.max(0, Math.floor(this.dispersionAmount * 0.5 - 5));
        }
        
        // Try to move
        let targetX = Math.round(newX + this.velocity.x);
        let targetY = Math.ceil(newY + this.velocity.y);
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
        
        if (newX == x && newY == y && this.velocity.y == 0 && this.dispersionAmount == 0) {
            // Inactivate the dust spec as no further movement will occur
            this.active = false;
        } else {
            // Update the position
            let dustAtTarget = world.getDust(newX, newY);
            dustAtTarget?.activate();
            world.setDust(x, y, dustAtTarget);
            world.setDust(newX, newY, this);

            // Agitate neighbors
            world.getNeighbors(x, y, this.dispersionDistance)
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
                let dustAtPosition = world.getDust(x + dir * distance, y);
                let dustBelow = world.getDust(x + dir * distance, y + 1);

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