const fs = require('fs');
const path = require('path');

const readjsonfile = async ({ dirpath, filename }) => {
    const fullpath = path.join(dirpath,filename)
    console.log(fullpath);

    return await new Promise((res,rej)=>{

        fs.readFile(fullpath, 'utf8', (err, data) => {
            if (err) {
                console.log(err);
                
                res({message:"cant serve you at this moment!"})
            }
            try {
                const jsonContent = JSON.parse(data);                
                res(jsonContent)
            } catch (parseError) {
                console.log(parseError);
    
                res({message:"cant serve you at this moment!!!"})
            }
        });

    })
    
    
}

exports.readjsonfile = readjsonfile;