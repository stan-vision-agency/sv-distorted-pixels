import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.121.1/build/three.module.js";

function DistoredPixels() {
    this.canvas = document.querySelector("canvas");
    this.img = document.querySelector(".img-stan");
    this.imgBounds = {};
    this.scene = null;
    this.camera = null;
    this.geometry = null;
    this.material = null;
    this.renderer = null;
    this.mesh = null;
    this.texture = null;
    this.dataTexture = null;
    this.sizeDataTexture = 32;
    this.size = {
        width: window.innerWidth,
        height: window.innerHeight
    }
    this.lenis = new Lenis({duration: 0.9});
    this.scrollCurrent = 0;
    this.scrollPrevious = 0;
    this.mouse = {
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        velocityX: 0,
        velocityY: 0
    }
}

DistoredPixels.prototype.createScene = function() {
    this.scene = new THREE.Scene();
}

DistoredPixels.prototype.createCamera = function() {
    const dist = 1;
    const fov = 2 * Math.atan((this.size.height / 2) / dist) * (180 / Math.PI);
    this.camera = new THREE.PerspectiveCamera(fov, this.size.width / this.size.height);
    this.camera.position.z = dist;
}

DistoredPixels.prototype.createDataTexture = function() {
    const width = this.sizeDataTexture;
    const height = this.sizeDataTexture;
    const size = width * height;
    const data = new Float32Array(3 * size);

    for(let i = 0; i < size; i++) {
        let r = Math.random() * 50;
        let r1 = Math.random() * 255;

        const stride = i * 3;

        data[stride] = r;
        data[stride + 1] = r1;
        data[stride + 2] = r;
    }

    this.dataTexture = new THREE.DataTexture(data, width, height, THREE.RGBFormat, THREE.FloatType);
    this.dataTexture.magFilter = this.dataTexture.minFilter = THREE.NearestFilter;
}

DistoredPixels.prototype.createPlane = function() {
    this.texture = new THREE.TextureLoader().load(this.img.src);
    this.geometry = new THREE.PlaneGeometry(1, 1, 25, 25);
    this.material = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: {
            uImage: {value: this.texture},
            uDataTexture: {value: this.dataTexture},
        },
        vertexShader: this.vertex(),
        fragmentShader: this.fragment()
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.y =  -this.imgBounds.top + (this.size.height/2) - (this.imgBounds.height / 2);
    this.mesh.position.x = this.imgBounds.left - (this.size.width / 2) + (this.imgBounds.width/2);
    this.mesh.scale.set(this.imgBounds.width, this.imgBounds.height);

    this.scene.add(this.mesh);
}

DistoredPixels.prototype.fragment = function() {
   return `
   varying vec2 vUv;

   uniform sampler2D uImage;
   uniform sampler2D uDataTexture;
    
   void main () {
        vec4 img = texture2D(uImage, vUv);
        vec4 offset = texture2D(uDataTexture,vUv);

        gl_FragColor = texture2D(uImage,vUv - 0.5 * offset.rg);
   }
   `;
}

DistoredPixels.prototype.vertex = function() {
   return `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
   `;
}

DistoredPixels.prototype.createRenderer = function() {
    this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
    });
    this.renderer.setSize(this.size.width, this.size.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.render(this.scene, this.camera);
}

DistoredPixels.prototype.resize = function() {
    let ww = window.innerWidth;

    window.addEventListener("resize", function() {
        if(ww !== window.innerWidth) {
            ww = window.innerWidth;

           setTimeout(() => {
                this.size.width = window.innerWidth;
                this.size.height = window.innerHeight;
                this.camera.aspect = this.size.width / this.size.height;
                
                this.updateImageBounds();
                this.updateImageSize();
                this.updateImagePosition();

                this.camera.updateProjectionMatrix();
                this.renderer.setSize(this.size.width, this.size.height);
                this.renderer.render(this.scene, this.camera);
           }, 50);
    
        }
    }.bind(this));
}

DistoredPixels.prototype.mouseMove = function() {
    this.img.addEventListener("mousemove", (e) => {
        const {left, top, width, height } = this.img.getBoundingClientRect();
        this.mouse.x = (e.clientX - left) / width;
        this.mouse.y = (e.clientY - top) / height;
        
        this.mouse.velocityX = this.mouse.x - this.mouse.prevX;
        this.mouse.velocityY = this.mouse.y - this.mouse.prevY;
        
        this.mouse.prevX = this.mouse.x;
        this.mouse.prevY = this.mouse.y;
    });
}

DistoredPixels.prototype.animate = function() {
    gsap.ticker.add((time) => {
        this.lenis.raf(time * 1000);
        this.scrollPrevious = this.scrollCurrent;
        this.scrollCurrent = this.lenis.scroll;

        if(Math.round(this.scrollPrevious) !== Math.round(this.scrollCurrent)) {
            this.updateImagePosition();
        }

        this.updateDataTexture();
        this.renderer.render(this.scene, this.camera);
    });
}

DistoredPixels.prototype.updateImagePosition = function() {
    this.mesh.position.y = window.scrollY - this.imgBounds.top + (this.size.height/2) - (this.imgBounds.height / 2);
    this.mesh.position.x = this.imgBounds.left - (this.size.width / 2) + (this.imgBounds.width/2);
}

DistoredPixels.prototype.updateImageSize = function() { 
    this.mesh.scale.set(this.imgBounds.width, this.imgBounds.height);
}

DistoredPixels.prototype.updateImageBounds = function() {
    const {top, left, width, height} = this.img.getBoundingClientRect();
    this.imgBounds.width = width;
    this.imgBounds.height = height;
    this.imgBounds.top = top;
    this.imgBounds.left = left;
}

DistoredPixels.prototype.updateDataTexture = function() {
    const data = this.dataTexture.image.data;
    const gridMouseX = this.sizeDataTexture * this.mouse.x;
    const gridMouseY = this.sizeDataTexture * (1- this.mouse.y);
    const maxDist = this.sizeDataTexture / 6;

    for (let i = 0; i < data.length; i += 3) {
        data[i] *= 0.91;
        data[i + 1] *= 0.91;
    }

    for (let y = 0; y < this.sizeDataTexture; y++) {
        for (let x = 0; x < this.sizeDataTexture; x++) {
            const distance = (gridMouseX - y) ** 2 + (gridMouseY - x)**2;
            const maxDistSq = maxDist ** 2;

            if(distance < maxDistSq) {
                const index = 3 * (y + this.sizeDataTexture * x);
                const power = gsap.utils.clamp(0, 10, maxDist / Math.sqrt(distance));

                data[index] += this.mouse.velocityX * power;
                data[index + 1] -= this.mouse.velocityY * power;
            }
        }
        
    }

    this.mouse.velocityX *= 0.91;
    this.mouse.velocityY *= 0.91;

    this.dataTexture.needsUpdate = true;
}

DistoredPixels.prototype.imageHasLoaded = function(cb) {
    const loader = new THREE.ImageLoader();

    loader.load(this.img.src, (img) => {
        const {top, left, width, height} = this.img.getBoundingClientRect();
        this.imgBounds.width = width;
        this.imgBounds.height = height;
        this.imgBounds.top = top;
        this.imgBounds.left = left;

        cb();
    });

}

DistoredPixels.prototype.init = function() {
    this.imageHasLoaded(() => {
        this.createScene();
        this.createCamera();
        this.createDataTexture();
        this.createPlane();
        this.createRenderer();
        this.resize();
        this.mouseMove();
        this.animate();
    });
}

const distortedPixels = new DistoredPixels();
distortedPixels.init();