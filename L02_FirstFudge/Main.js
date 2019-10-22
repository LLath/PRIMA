"use strict";
var L02_FirstFudge;
(function (L02_FirstFudge) {
    var f = FudgeCore;
    window.addEventListener("load", hndLoad);
    /**
     *
     * @param _event
     */
    function hndLoad(_event) {
        const canvas = document.querySelector("canvas");
        f.RenderManager.initialize();
        let material = new f.Material("SolidWhite", f.ShaderUniColor, new f.CoatColored(f.Color.WHITE));
        let nodeRoot = new f.Node("Root");
        let paddelLeft = createQuadComponent("PaddelLeft", material, new f.MeshQuad(), new f.Vector2(-7, 0), new f.Vector2(0.05, 3));
        nodeRoot.appendChild(paddelLeft);
        let paddleRight = createQuadComponent("PaddleRight", material, new f.MeshQuad(), new f.Vector2(7, 0), new f.Vector2(0.05, 3));
        nodeRoot.appendChild(createQuadComponent("Ball", material, new f.MeshQuad(), new f.Vector2(0, 0), new f.Vector2(0.1, 0.1)));
        nodeRoot.appendChild(paddleRight);
        let cmpCamera = new f.ComponentCamera();
        cmpCamera.pivot.translateZ(15);
        L02_FirstFudge.viewport = new f.Viewport();
        L02_FirstFudge.viewport.initialize("Viewport", nodeRoot, cmpCamera, canvas);
        L02_FirstFudge.viewport.showSceneGraph();
        L02_FirstFudge.viewport.draw();
    }
    /**
     *
     * @param _nameNode
     * @param _material
     * @param _mesh
     * @param _pos
     * @param _scale
     */
    function createQuadComponent(_nameNode, _material, _mesh, _pos, _scale) {
        const node = new f.Node(_nameNode);
        const cmpMesh = new f.ComponentMesh(_mesh);
        const cmpMaterial = new f.ComponentMaterial(_material);
        const scale = new f.Vector3(_scale.x, _scale.y, 0);
        const pos = new f.Vector3(_pos.x, _pos.y, 0);
        cmpMesh.pivot.scale(scale);
        node.addComponent(cmpMesh);
        node.addComponent(cmpMaterial);
        node.addComponent(new f.ComponentTransform());
        node.cmpTransform.local.translate(pos);
        return node;
    }
})(L02_FirstFudge || (L02_FirstFudge = {}));
//# sourceMappingURL=Main.js.map