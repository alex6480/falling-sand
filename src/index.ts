import { Gravel } from "./DustType/Gravel";
import { Sand } from "./DustType/Sand";
import { Solid } from "./DustType/Solid";
import { Liquid } from "./DustType/Liquid";
import { World } from "./World";

let canvas: HTMLCanvasElement | null = null;

let dustTypes = ["none", "solid", "sand", "gravel", "water"]
let currentDustIndex: number = 0;
let isDrawingDust = false;
let drawRadius = 10;

let mousePos = { x: 0, y: 0 };

function load()
{
    document.body.style.margin = "0";
    document.body.style.height = "100vh";
    document.body.style.overflow = "hidden";
    
    window.addEventListener("resize", resize);

    canvas = document.createElement("canvas");
    canvas.addEventListener("mousedown", ev => { mouseMove(ev); isDrawingDust = true; });
    canvas.addEventListener("mouseup", () => isDrawingDust = false);
    canvas.addEventListener("mousemove", mouseMove);
    window.addEventListener("keydown", keydown);
    window.addEventListener("wheel", (ev: WheelEvent) => {
        drawRadius = Math.max(0, drawRadius + Math.max(-1, Math.min(1, -ev.deltaY)));
        console.log(drawRadius);
    })

    let ctx = canvas.getContext("2d");

    document.body.appendChild(canvas);
    window.requestAnimationFrame(animationFrame);
    
    let world = new World(ctx, 1, 300, 300);
    resize();

    function animationFrame()
    {
        if (isDrawingDust)
        {
            world.fillCircle({ x: mousePos.x / world.scale, y: mousePos.y / world.scale }, drawRadius, () => {
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
                    default:
                        return null;
                }
            });
        }

        world.step();
        window.requestAnimationFrame(animationFrame);
    }

    function mouseMove(ev: MouseEvent)
    {
        let canvasBB = canvas.getBoundingClientRect();
        mousePos.x = ev.clientX - canvasBB.x;
        mousePos.y = ev.clientY - canvasBB.y;
    }

    function resize()
    {
        if (canvas !== null)
        {
            canvas.setAttribute("width", document.body.clientWidth.toString());
            canvas.setAttribute("height", document.body.clientHeight.toString());
            world.scale = Math.min(Math.floor(canvas.width / world.width), Math.floor(canvas.height / world.height));
            
            world.renderAll();
        }
    }

    function keydown(ev: KeyboardEvent)
    {
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