module.exports = async function (context, req) {

    // Get query parameters
    const pairs = req.body.split('&')
    let parameters = []
    pairs.forEach( pair => {
        pair = pair.split('=');
        parameters[pair[0]] = decodeURIComponent(pair[1] || '');
    });

    const text = parameters.text
    const slackUrl = parameters.response_url
    
    // return acknowledgement
    context.res = {
            status: 200
    };
    context.done()

    const axios = require("axios")
    const API_URL = "https://www.thecocktaildb.com/api/json/v1/1/"

    // if request included an ingredient, get a drink with it, if not, get a random.
    const response = text == "" ?  
        await axios.get(API_URL + "random.php") :
        await axios.get(API_URL + "filter.php?i="+text)

    const data = response.data
    if (!data) {
        await axios.post(
            slackUrl,
            {"text": "No drinks with " + text},
            {headers: {'content-type': 'application/json'}}
        )

    } else {   
        // if drink was found by ingredient, make another request to get full drink info
        if (text) {
            const randomDrink = data.drinks[Math.floor(Math.random()*data.drinks.length)]
            const resp = await axios.get(API_URL + "lookup.php?i="+randomDrink.idDrink)	    
  
            axios.post(
                slackUrl,
                blockify(resp.data.drinks[0]),
                {headers: {'content-type': 'application/json'}}
            )
        } else {
            axios.post(
                slackUrl,
                blockify(data.drinks[0]),
                {headers: {'content-type': 'application/json'}}
            )
        }
    }
}

// Blockifying the drink to a nicely formatted Slack message
function blockify (drink) {
    return ({       
        "blocks":  [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*"+drink.strDrink+"*"
                }                       
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": ingredientList(drink)
                },
                "accessory": {
                    "type": "image",
                    "image_url": drink.strDrinkThumb,
                    "alt_text": "drink"
			    }
            },{
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "_" + drink.strInstructions + "_"
                }                       
            }
        ]
    })
}

// Ingredients are returned as objects ingredient1, ingredient2.. ingredientN. If only 3, ingredient4 an on will be null. Same for measure
function ingredientList(drink) {
    let res = ""
    let i = 1
    let looping = true
    while (looping) {
        let str = "strIngredient" + i
        let ingredient = drink[str]
        if (ingredient == null){
             looping = false
        } else {
            let measure = drink["strMeasure"+i] ? " (" + drink["strMeasure"+i].trim() + ")" : ""
            res += "\n• " + ingredient + measure
        }
        i++
    }
 return res
}
