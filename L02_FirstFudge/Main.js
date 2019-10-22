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
        let node = new f.Node("Quad");
        let nodeBackground = new f.Node("Background");
        let mesh = new f.MeshQuad();
        let cmpMesh = new f.ComponentMesh(mesh);
        node.addComponent(cmpMesh);
        nodeBackground.addComponent(new f.ComponentMesh(mesh));
        let mtrSolidWhite = new f.Material("SolidWhite", f.ShaderUniColor, new f.CoatColored(new f.Color(1, 1, 1, 1)));
        let cmpMaterial = new f.ComponentMaterial(mtrSolidWhite);
        let mtrSolidGrey = new f.Material("SolidGrey", f.ShaderUniColor, new f.CoatColored(new f.Color(0.5, 0.5, 0.5, 1)));
        let cmpMaterialBackground = new f.ComponentMaterial(mtrSolidGrey);
        node.addComponent(cmpMaterial);
        nodeBackground.addComponent(cmpMaterialBackground);
        let cmpCamera = new f.ComponentCamera();
        cmpCamera.pivot.translateZ(15);
        nodeBackground.appendChild(node);
        L02_FirstFudge.viewport = new f.Viewport();
        L02_FirstFudge.viewport.initialize("Viewport", nodeBackground, cmpCamera, canvas);
        L02_FirstFudge.viewport.showSceneGraph();
        L02_FirstFudge.viewport.draw();
    }
})(L02_FirstFudge || (L02_FirstFudge = {}));
//# sourceMappingURL=Main.js.map