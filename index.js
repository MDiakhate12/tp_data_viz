const dayOfYear = dateString => {
    const date = new Date(Date.parse(dateString));
    return Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
}

const weekNumber = day => Math.floor(day / 7)

const INITIAL_DATE = "2021-06-01"
const LAST_DATE = "2021-11-25"

const firstDate = dayOfYear(INITIAL_DATE)
const lastDate = dayOfYear(LAST_DATE)

var width = 700,
    height = 580;

var svg = d3
    .select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

var tooltip = d3
    .select('body')
    .append('div')
    .attr('class', 'hidden tooltip');

// On rajoute un groupe englobant toute la visualisation pour plus tard
var g = svg.append("g");


// Autres projections : geoMercator, geoNaturalEarth1, ...
// https://github.com/d3/d3-geo/blob/master/README.md
var projection = d3.geoConicConformal().center([2.454071, 46.279229]).scale(2800);

// On definie une echelle de couleur
// via https://observablehq.com/@d3/color-schemes?collection=@d3/d3-scale-chromatic
var color = d3
    .scaleQuantize()
    .range(["#edf8e9", "#bae4b3", "#74c476", "#31a354", "#006d2c"]);

var path = d3.geoPath().projection(projection);

var jourChoisi = "2021-06-01" // pour demarrer on code en dur un jour a afficher

// Chargement des donnees
d3.csv("covid-06-11-2021.csv").then(data => {
    var cleanData = data.filter(line => line.sexe == "0")

    // console.log(cleanData)

    color.domain([
        d3.min(data, function (d) {
            return d.hosp;
        }),
        d3.max(data, function (d) {
            return d.hosp;
        })
    ]);

    d3.json("departements.geojson").then(json => {
        //On fusionne les donnees avec le GeoJSON des departements

        // console.log(json)

        //On parcours les departements du GeoJSON un par un
        for (var j = 0; j < json.features.length; j++) {
            var departement = json.features[j].properties

            // find permet d'eviter de faire une boucle sur toutes les donnees 
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find#find_an_object_in_an_array_by_one_of_its_properties

            // var jourDepChoisi = cleanData.find(row =>
            //     row.dep == departement.code && // r??cup??rer le departement
            //     row.jour == jourChoisi // r??cup??re le jour
            // )

            // json.features[j].properties.value = jourDepChoisi.hosp;
            // console.log(json.features[j].properties)

            const hospitalisations = cleanData
                .filter(row => row.dep == departement.code)
                .map(row => row.hosp)

            json.features[j].properties.value = hospitalisations;

            // console.log(hospitalisations)
        }

        // console.log(json.features)

        // g.selectAll("path")
        //     .data(json.features)
        //     .join("path")
        //     .attr("d", path)
        //     .attr("class", "departement")
        //     .style("fill", function (d) {
        //         //on prend la valeur recupere plus haut
        //         var value = d.properties.value;

        //         if (value) {
        //             return color(value);
        //         } else {
        //             // si pas de valeur alors en gris
        //             return "#ccc";
        //         }
        //     });


        d3.select("#slider").on("input", function () {

            // d3.select("#full-day").html(date.toLocaleDateString('fr-FR', options))
            drawMap(parseInt(this.value));
        });

        const dayIndex = dayOfYear(jourChoisi) - firstDate

        drawMap(dayIndex)

        function drawMap(currentDay) {

            carte = svg.selectAll("path")
                .data(json.features)

            carte.join("path")
                .attr("d", path)
                .attr("class", "departement")
                .style("fill", function (d) {
                    //on prend la valeur recupere plus haut
                    var value = d.properties.value[currentDay];

                    if (value) {
                        return color(value);
                    } else {
                        // si pas de valeur alors en gris
                        return "#ccc";
                    }
                });

            d3.select("#week-day").html(`Semaine n??${1 + weekNumber(currentDay)}`)
            d3.select("#day").html(`Jour n??${1 + currentDay}`)

            svg.selectAll('.departement')
                .data(json.features)
                .join('path')
                .attr('class', 'departement') // on ajoute la classe css 'province' a l'element svg path
                .attr('d', path) // on cree la forme de l'etat
                // .append("title")
                // .text((item) => item.properties.nom)
                .on('mousemove', (e, d) => {

                    const [x, y] = [e.clientX, e.clientY]

                    const style = `left: ${x + 15}px; top: ${y - 35}px`

                    const html = `
                    <div class="tooltip-title">${d.properties.nom}</div>
                    <div class="tooltip-text">${d.properties.value[currentDay]}</div>
                `
                    tooltip.classed('hidden', false).html(html).attr('style', style)
                })
                .on('mouseout', (e, d) => {
                    tooltip.classed('hidden', true)
                })

            // Afficher les donn??es pour une journ??e
            var hosp = cleanData
                .filter(row => dayOfYear(row.jour) - firstDate == currentDay)
                .map(row => parseInt(row.hosp))
                .reduce((a, b) => a + b)

            d3.select("#hosp-number").html(hosp)


            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            console.log("currentDay", currentDay)
            const currentDate = dayNumberToDate(currentDay + firstDate)
            d3.select("#hosp-date").html(currentDate.toLocaleDateString('fr-FR', options))
        }

    })

})


const dayNumberToDate = dayNumber => {
    const numberOfDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,]

    var cumul = 0
    var month, day;
    
    for (i = 0; i < numberOfDays.length; i++) {
        if (dayNumber >= cumul && dayNumber <= cumul + numberOfDays[i]) {
            month = i
            day = dayNumber - cumul
            break
        }
        cumul += numberOfDays[i]
    }

    return new Date(2021, month, day)
}
