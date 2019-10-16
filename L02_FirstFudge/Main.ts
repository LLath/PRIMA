namespace L02_FirstFudge {
    import f = FudgeCore;

    window.addEventListener("load", hndLoad);
    export let viewport: f.Viewport;

    /**
     * 
     * @param _event 
     */
    function hndLoad(_event: Event): void  {
        const canvas: HTMLCanvasElement = document.querySelector("canvas");
        f.RenderManager.initialize();

        let node: f.Node = new f.Node("Quad");
        let mesh: f.MeshQuad = new f.MeshQuad();
        let cmpMesh: f.ComponentMesh = new f.ComponentMesh(mesh);
        node.addComponent(cmpMesh);

        let mtrSolidWhite: f.Material = new f.Material("SolidWhite", f.ShaderUniColor, new f.CoatColored(new f.Color(1, 1, 1, 1)));
        let cmpMaterial: f.ComponentMaterial = new f.ComponentMaterial(mtrSolidWhite);
        node.addComponent(cmpMaterial);

        let cmpCamera: f.ComponentCamera = new f.ComponentCamera();
        cmpCamera.pivot.translateZ(3);

        
        viewport = new f.Viewport();
        f.Debug.log(canvas);
        viewport.initialize("Viewport", node, cmpCamera, canvas);
        f.Debug.log(viewport);

        viewport.draw();
    }
}