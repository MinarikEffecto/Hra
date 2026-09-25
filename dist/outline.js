import * as THREE from './vendor/three.module.js';
// Draw an inner silhouette edge only where scene depth hides the animated player.
export function createOcclusionOutline(renderer,scene,camera,player){
 const makeTarget=()=>{const t=new THREE.WebGLRenderTarget(1,1);t.depthTexture=new THREE.DepthTexture(1,1);t.texture.minFilter=t.texture.magFilter=THREE.NearestFilter;return t};
 const world=makeTarget(),mask=makeTarget(),maskScene=new THREE.Scene();maskScene.background=new THREE.Color(0);
 const copies=[],white=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
 player.traverse(o=>{if(o.isMesh){const m=new THREE.Mesh(o.geometry,white);m.matrixAutoUpdate=false;maskScene.add(m);copies.push([o,m])}});
 const uniforms={colorMap:{value:world.texture},sceneDepth:{value:world.depthTexture},maskMap:{value:mask.texture},playerDepth:{value:mask.depthTexture},pixel:{value:new THREE.Vector2(1,1)}};
 const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,toneMapped:true,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
 varying vec2 vUv;uniform sampler2D colorMap,sceneDepth,maskMap,playerDepth;uniform vec2 pixel;
 void main(){vec3 color=texture2D(colorMap,vUv).rgb;float center=texture2D(maskMap,vUv).r;
 float inner=1.;for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){inner=min(inner,texture2D(maskMap,vUv+vec2(float(x),float(y))*pixel*2.).r);}}
 float edge=step(.5,center)*(1.-step(.5,inner));
 float hidden=step(texture2D(sceneDepth,vUv).r+.00003,texture2D(playerDepth,vUv).r);
 color=mix(color,vec3(1.,.86,.39),edge*hidden*.95);gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const quadScene=new THREE.Scene();quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));const quadCamera=new THREE.Camera(),size=new THREE.Vector2();
 return {render(){renderer.getDrawingBufferSize(size);if(world.width!==size.x||world.height!==size.y){world.setSize(size.x,size.y);mask.setSize(size.x,size.y);uniforms.pixel.value.set(1/size.x,1/size.y)}scene.updateMatrixWorld(true);for(const [source,copy]of copies)copy.matrix.copy(source.matrixWorld);
 renderer.setRenderTarget(world);renderer.render(scene,camera);renderer.setRenderTarget(mask);renderer.render(maskScene,camera);renderer.setRenderTarget(null);renderer.render(quadScene,quadCamera);}};
}
