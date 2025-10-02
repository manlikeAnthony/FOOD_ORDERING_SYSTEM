const multer = require('multer')

const storage = multer.memoryStorage();
const upload = multer({storage : storage})


module.exports = upload


//docgen build -i "C:\Users\user\Downloads\FOOD_ORDERING(ChopLife).postman_collection_main.json" -o "C:\Users\user\Desktop\api-docs_main.html"