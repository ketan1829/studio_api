const mongodb = require('mongodb');

const getDb = require('../database').getDB; 
const ObjectId = mongodb.ObjectId;


async function paginate(collectionName, filter, options) {
    try {
        const db = getDb();
        let sort = {};
        console.log("options", options);
        if (options.sortBy) {
            const sortingCriteria = options.sortBy.split(',').map(sortOption => {
                const [key, order] = sortOption.split(':');
                return { [key]: order === 'desc' ? -1 : 1 };
            });
            sortingCriteria.forEach(criteria => {
                sort = { ...sort, ...criteria };
            });
        }

        const limit = parseInt(options.limit, 10) || 10;
        const page = parseInt(options.page, 10) || 1;
        const skip = (page - 1) * limit;

        // console.log("sort--", sort)
        const countPromise = db.collection(collectionName).countDocuments(filter);
        let docsPromise = db.collection(collectionName).find(filter).sort(sort).skip(skip).limit(limit);

        if (options.populate) {
            console.log("populate ---", options.populate);
            options.populate.split(',').forEach(populateOption => {
                const path = populateOption.split('.').reduceRight((acc, cur) => ({ path: cur, populate: acc }), {});
                console.log("populate path ---", path);
                docsPromise = docsPromise.populate(path);
            });
        }

        

        const [totalResults, results] = await Promise.all([countPromise, docsPromise.toArray()]);

        const totalPages = Math.ceil(totalResults / limit);
        
        return {
            results,
            page,
            limit,
            totalPages,
            totalResults,
        };
    } catch (error) {
        // Handle errors appropriately
        throw new Error('Pagination failed: ' + error.message);
    }
}


module.exports = {paginate};