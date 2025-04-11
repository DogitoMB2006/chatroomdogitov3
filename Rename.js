const fs = require("fs")
const path = require("path")
const Folder = "Placeholder"

async function RenameFiles(folder) {
    const MainFolder = await fs.readdirSync(path.join(__dirname, folder))
    MainFolder.forEach(async file => {
        const OldPath = path.join(__dirname, folder, file)
        const NewPath = path.join(__dirname, folder, file?.replace("jsx", "tsx"))
    fs.rename(OldPath, NewPath, function (err) {
        if (err) return new Error(err);
        console.log(`
         ${file} has been renamed to ${file?.replace("jsx", "tsx")}   
            `)
    })
    })
} 

RenameFiles(Folder)
