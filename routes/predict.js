const express = require("express");
const router = express.Router();
const multer = require('multer');
const tf = require("@tensorflow/tfjs");
const fs = require("fs");
const tfHub = require("@tensorflow/tfjs-converter");
const tfn = require("@tensorflow/tfjs-node");
const sharp = require('sharp');
const { error } = require("console");
const upload = multer({ dest: 'uploads/' });

const class_idx_map = {
  Apple___Apple_scab: 0,
  Apple___Black_rot: 1,
  Apple___Cedar_apple_rust: 2,
  Apple___healthy: 3,
  Blueberry___healthy: 4,
  "Cherry_(including_sour)___Powdery_mildew": 5,
  "Cherry_(including_sour)___healthy": 6,
  "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": 7,
  "Corn_(maize)___Common_rust_": 8,
  "Corn_(maize)___Northern_Leaf_Blight": 9,
  "Corn_(maize)___healthy": 10,
  Grape___Black_rot: 11,
  "Grape___Esca_(Black_Measles)": 12,
  "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": 13,
  Grape___healthy: 14,
  "Orange___Haunglongbing_(Citrus_greening)": 15,
  Peach___Bacterial_spot: 16,
  Peach___healthy: 17,
  "Pepper,_bell___Bacterial_spot": 18,
  "Pepper,_bell___healthy": 19,
  Potato___Early_blight: 20,
  Potato___Late_blight: 21,
  Potato___healthy: 22,
  Raspberry___healthy: 23,
  Soybean___healthy: 24,
  Squash___Powdery_mildew: 25,
  Strawberry___Leaf_scorch: 26,
  Strawberry___healthy: 27,
  Tomato___Bacterial_spot: 28,
  Tomato___Early_blight: 29,
  Tomato___Late_blight: 30,
  Tomato___Leaf_Mold: 31,
  Tomato___Septoria_leaf_spot: 32,
  "Tomato___Spider_mites Two-spotted_spider_mite": 33,
  Tomato___Target_Spot: 34,
  Tomato___Tomato_Yellow_Leaf_Curl_Virus: 35,
  Tomato___Tomato_mosaic_virus: 36,
  Tomato___healthy: 37,
};

const idx_class_map = {};
for (let key in class_idx_map) {
  let value = class_idx_map[key];
  idx_class_map[value] = key;
}

let model;

async function loadGraphModel() {
  const handler = tfn.io.fileSystem("tfjs_model_dir/model.json");

  model = await tf.loadGraphModel(handler);
  // outputTensor = model.outputs[0];
  // console.log(outputTensor.classNames); // ["class 0", "class 1", "class 2", ...]
  return model;
}

async function predict_image(img) {
  // const img = fs.readFileSync("test_pics/images-3.jpeg");
  const tensor = tfn.node.decodeImage(img);

  const resized = tf.image.resizeBilinear(tensor, [224, 224]);
  const casted = resized.cast("float32");
  const expanded = casted.expandDims(0);
  const normalized = expanded.div(255.0);

  if (!model) {
    // Check if the model has already been loaded
    await loadGraphModel(); // Load the model if it hasn't been loaded yet
  }
  const prediction = model.predict(normalized);

  const probs = prediction.dataSync();
  const classIndex = probs.indexOf(Math.max(...probs));

  // console.log("Predicted class index:", classIndex);
  // console.log("Class: ", idx_class_map[classIndex])
  // console.log("Accuracy: ", probs[classIndex])

  return [idx_class_map[classIndex], probs[classIndex]];
}

loadGraphModel();

predict_image("leaf.jpg").then(
  result => {
    console.log(result)
  }
)

router.get("/", (req, res, next) => {
  // testing if taking requests
  res.status(200).json({
    res: "server is receiving requests",
  });
});
router.post("/", upload.single('file'), async (req, res, next) => {
  // put logic here
  const file = req.file;
  const filePath = file.path;
  // Read the uploaded file from disk
  const fileBuffer = fs.readFileSync(filePath);

  // Convert the file to JPEG format using sharp
  const converted = await sharp(fileBuffer).jpeg().toBuffer();
  predict_image(converted).then(result =>{
    res.status(201).json({
      type: result[0],
      accuracy: result[1]
    });
  }).catch(err=>{
    console.log(err);
    res.status(500).json({
      message: "Error processing file"
    });
  })
});

module.exports = router;
