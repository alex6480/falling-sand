import { Gravel } from "./DustType/Gravel";
import { Sand } from "./DustType/Sand";
import { Solid } from "./DustType/Solid";
import { Liquid } from "./DustType/Liquid";
import { World } from "./World";
import { Gas } from "./DustType/Gas";
import { Dust } from "./Dust";
import Ray from "./QuadTree/ray";
import { Vec } from "./Helpers/math";

let canvas: HTMLCanvasElement | null = null;

let dustTypes = ["none", "solid", "sand", "gravel", "water", "gas"]
let currentDustIndex: number = 0;
let isDrawingDust = false;
let renderQuadTree = false;
let drawRadius = 10;

let scale = 1;
let mousePos = { x: 0, y: 0 };

function load()
{
    document.body.style.margin = "0";
    document.body.style.height = "100vh";
    document.body.style.overflow = "hidden";
    
    window.addEventListener("resize", resize);

    canvas = document.createElement("canvas");
    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("mouseup", () => isDrawingDust = false);
    canvas.addEventListener("mousemove", mouseMove);
    canvas.addEventListener("contextmenu", ev => ev.preventDefault());
    window.addEventListener("keydown", keydown);
    window.addEventListener("wheel", (ev: WheelEvent) => {
        drawRadius = Math.max(0, drawRadius + Math.max(-1, Math.min(1, -ev.deltaY)));
        console.log(drawRadius);
    });

    let ctx = canvas.getContext("2d");

    document.body.appendChild(canvas);
    window.requestAnimationFrame(animationFrame);
    
    let world = new World(300, 300);
    let rays: Ray[] = [];
    resize();

    function animationFrame()
    {
        if (isDrawingDust)
        {
            world.dust.fillCircle({ x: mousePos.x / scale, y: mousePos.y / scale }, drawRadius, getDrawedDust);
        }

        world.step();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the map at scale 1 and then redraw it afterwards at the correct scale
        ctx.putImageData(world.dust.imageData, 0, 0);
        ctx.drawImage(ctx.canvas, 0, 0, world.width, world.height, 0, 0, world.width * scale, world.height * scale);
        if (renderQuadTree) world.dust.quadTree.render(ctx, scale);

        let dustColor = getDrawedDust()?.color;
        ctx.strokeStyle = dustColor === undefined ? "red" : `rgb(${dustColor.red}, ${dustColor.green}, ${dustColor.blue})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, drawRadius * scale, 0, 2 * Math.PI);
        ctx.stroke();

        rays.forEach(ray => {
            ctx.beginPath();
            ctx.strokeStyle = "red";
            ctx.moveTo(ray.origin.a * scale, ray.origin.b * scale);
            ctx.lineTo(ray.origin.a * scale + ray.direction.a * ray.length * scale, ray.origin.b * scale + ray.direction.b * ray.length * scale);
            ctx.stroke();
        });

        window.requestAnimationFrame(animationFrame);
    }

    function getDrawedDust(): Dust | null {
        switch (dustTypes[currentDustIndex])
        {
            case "solid":
                return new Solid();
            case "sand":
                return new Sand();
            case "gravel":
                return new Gravel();
            case "water":
                return new Liquid();
            case "gas":
                return new Gas();
            default:
                return null;
        }
    }

    function mouseDown(ev: MouseEvent) {
        if (ev.button == 0) {
            isDrawingDust = true;
        }

        mouseMove(ev);
        if (ev.button == 2) {
            let rayCount = 100;
            rays = [];
            for (let i = 0; i < rayCount; i++) {
                let angle = Math.PI * 2 / rayCount * i;
                let ray = new Ray(new Vec(mousePos.x / scale, mousePos.y / scale), new Vec(Math.acos(angle), Math.asin(angle)).norm());
                ray.length = world.dust.traceRay(ray.origin, ray.direction, (step) => ["sand", "solid"].includes(step));
                if (ray.length === Infinity) ray.length = 1000;
                rays.push(ray);
            }
        }
    }

    function mouseMove(ev: MouseEvent) {
        let canvasBB = canvas.getBoundingClientRect();
        mousePos.x = ev.clientX - canvasBB.x;
        mousePos.y = ev.clientY - canvasBB.y;
    }

    function resize() {
        if (canvas !== null)
        {
            canvas.setAttribute("width", document.body.clientWidth.toString());
            canvas.setAttribute("height", document.body.clientHeight.toString());
            scale = Math.min(Math.floor(canvas.width / world.width), Math.floor(canvas.height / world.height));
        }
    }

    function keydown(ev: KeyboardEvent) {
        if (ev.key === "q") {
            renderQuadTree = !renderQuadTree;
        }

        if (Array.from({ length: 10 }, (v, k) => (k + 1).toString()).indexOf(ev.key) != -1)
        {
            let index = Number(ev.key) - 1;
            if (index >= 0 && index < dustTypes.length)
            {
                currentDustIndex = index;
                console.log(dustTypes[index]);
            }
        }
    }
}

window.addEventListener("load", load);