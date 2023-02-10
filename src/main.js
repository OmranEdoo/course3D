import * as THREE from 'three'
import * as YUKA from 'yuka';

// NOTE: three/addons alias or importmap does not seem to be supported by Parcel, use three/examples/jsm/ instead 

import {
  OrbitControls
} from 'three/examples/jsm/controls/OrbitControls.js';

import {
  GLTFLoader
} from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Vector3 } from 'three';

// Example of hard link to official repo for data, if needed
// const MODEL_PATH = 'https://raw.githubusercontent.com/mrdoob/three.js/r148/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb';


// INSERT CODE HERE
var camera, scene, renderer, vehicle, goal, keys, route, voiture;
let initOK = false;

var time = 0;
var newPosition = new THREE.Vector3();
var matrix = new THREE.Matrix4();

var stop = 1;
var DEGTORAD = 0.01745327;
var temp = new THREE.Vector3;
var dir = new THREE.Vector3;
var a = new THREE.Vector3;
var b = new THREE.Vector3;
var coronaSafetyDistance = 5;
var velocity = 0.0;
var speed = 0.0;

init();
animate();

function init() {

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10);
  camera.position.set(0, 3.3, 0);

  scene = new THREE.Scene();
  camera.lookAt(scene.position);

  goal = new THREE.Object3D;
  //follow = new THREE.Object3D;
  goal.position.z = -coronaSafetyDistance;
  goal.add(camera);

  var gridHelper = new THREE.GridHelper(100, 100);
  scene.add(gridHelper);

  scene.add(new THREE.AxesHelper());

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //const controls = new OrbitControls(camera, renderer.domElement);
  //controls.listenToKeyEvents(window); // optional

  const ambientLight = new THREE.AmbientLight(0x333333);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
  directionalLight.position.set(0, 10, 10);
  scene.add(directionalLight);

  var routeGeometry = new THREE.BoxBufferGeometry(1, 1, 1);
  var routeMaterial = new THREE.MeshNormalMaterial();

  route = new THREE.Mesh(routeGeometry, routeMaterial);

  scene.add(route);

  vehicle = new YUKA.Vehicle(); /// ?

  function sync(entity, renderComponent) {
    renderComponent.matrix.copy(entity.worldMatrix);
  }

  const path = new YUKA.Path();
  path.add(new YUKA.Vector3(-16, 0, 4));
  path.add(new YUKA.Vector3(-12, 0, 0));
  path.add(new YUKA.Vector3(-6, 0, -12));
  path.add(new YUKA.Vector3(0, 0, 0));
  path.add(new YUKA.Vector3(8, 0, -8));
  path.add(new YUKA.Vector3(10, 0, 0));
  path.add(new YUKA.Vector3(4, 0, 4));
  path.add(new YUKA.Vector3(0, 0, 6));

  path.loop = true;

  //vehicle.position.copy(path.current());

  vehicle.maxSpeed = 5;

  const followPathBehavior = new YUKA.FollowPathBehavior(path, 3);
  //vehicle.steering.add(followPathBehavior);

  const onPathBehavior = new YUKA.OnPathBehavior(path);
  //onPathBehavior.radius = 2;
  //vehicle.steering.add(onPathBehavior);

  const entityManager = new YUKA.EntityManager();
  //entityManager.add(vehicle);

  function loadData(fileName, coord) {
    new GLTFLoader()
      .setPath('assets/models/')
      .load(fileName, function (gltf) {
        voiture = gltf.scene;//.children[0];

        if (voiture != null) {
          console.log("Model loaded:  " + voiture);
          voiture.matrixAutoUpdate = true;
          console.log(voiture);
          //voiture.position.set(10, 0, 0);
          //voiture.scale = new THREE.Vector3(20, 2, 2);
          scene.add(voiture);
          console.log(voiture);

          initOK = true;
          /*
          vehicle.scale = new YUKA.Vector3(0.2, 0.2, 0.2);
          vehicle.setRenderComponent(model, sync);*/

        }
        else {
          console.log("Load FAILED.");
        }
      });
  }
  /////faire pas un vehicule yuka mais un objet normal 


  loadData('voiture.glb', new Vector3(0, 0, 0));
  //loadData('voiture.glb', new Vector3(1, 0, 1));

  const positions = [];
  for (let i = 0; i < path._waypoints.length; i++) {
    const point = path._waypoints[i];
    positions.push(point.x, point.y, point.z);
  }

  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF });
  const lines = new THREE.LineLoop(lineGeometry, lineMaterial);
  scene.add(lines);

  keys = {
    a: false,
    s: false,
    d: false,
    w: false
  };
  document.body.addEventListener('keydown', function (e) {

    var key = e.code.replace('Key', '').toLowerCase();
    if (keys[key] !== undefined)
      keys[key] = true;

  });
  document.body.addEventListener('keyup', function (e) {

    var key = e.code.replace('Key', '').toLowerCase();
    if (keys[key] !== undefined)
      keys[key] = false;

  });

  //route.position.set(0, 0, -5);

  //camera.position.set(vehicle.position.x + 2, vehicle.position.y + 2, vehicle.position.z + 2);
  console.log(voiture);
}


function animate() {


  //console.log(voiture.position);

  requestAnimationFrame(animate);

  if (!initOK) {
    return;
  }

  speed = 0.0;


  if (keys.w)
    speed = 0.05;
  else if (keys.s)
    speed = -0.05;

  velocity += (speed - velocity) * .3;
  voiture.translateZ(velocity);

  if (keys.a)
    voiture.rotateY(0.01);
  else if (keys.d)
    voiture.rotateY(-0.01);


  a.lerp(voiture.position, 1.9);
  b.copy(goal.position);

  dir.copy(a).sub(b).normalize();
  const dis = a.distanceTo(b) - coronaSafetyDistance;
  goal.position.addScaledVector(dir, dis);
  //temp.setFromMatrixPosition(goal.matrixWorld);

  //camera.position.lerp(temp, 0.2);
  camera.lookAt(voiture.position);


  renderer.render(scene, camera);
}