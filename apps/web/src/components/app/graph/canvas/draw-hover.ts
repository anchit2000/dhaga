import type { NodeHoverDrawingFunction } from "sigma/rendering";
import type { EdgeRenderAttributes, NodeRenderAttributes } from "./reducers";
import type { GraphTheme } from "./theme";

/**
 * Brand-tinted hover card: sigma's default draws a white box, which glares on
 * the ink canvas. This draws a panel-coloured pill with a seam border and an
 * amber halo ring around the node instead.
 */
export function makeDrawNodeHover(
  theme: GraphTheme,
): NodeHoverDrawingFunction<NodeRenderAttributes, EdgeRenderAttributes> {
  return (context, data, settings) => {
    // Halo ring.
    context.beginPath();
    context.arc(data.x, data.y, data.size + 3, 0, Math.PI * 2);
    context.strokeStyle = theme.amber;
    context.lineWidth = 1.5;
    context.stroke();

    if (!data.label) return;
    const size = settings.labelSize;
    context.font = `${settings.labelWeight} ${size}px ${settings.labelFont}`;
    const width = context.measureText(data.label).width;
    const padX = 6;
    const padY = 4;
    const boxX = data.x + data.size + 6;
    const boxY = data.y - size / 2 - padY;
    const boxW = width + padX * 2;
    const boxH = size + padY * 2;

    context.beginPath();
    context.roundRect(boxX, boxY, boxW, boxH, 6);
    context.fillStyle = theme.panel;
    context.fill();
    context.strokeStyle = theme.seam;
    context.lineWidth = 1;
    context.stroke();

    context.fillStyle = theme.paper;
    context.textBaseline = "middle";
    context.fillText(data.label, boxX + padX, boxY + boxH / 2 + 1);
  };
}
