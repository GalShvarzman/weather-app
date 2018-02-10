const json2csv = require('json2csv');
const fs = require('fs');
const fields = ['Date', 'Day temp', 'Min temp', 'Max temp'];  
const express = require('express');
const app = express();
const request = require('request');
const apiKey = 'cfd10582b35f1dc2429b5fbca56eaca1';
// const gunzip = require('gunzip-file');
// gunzip('./city.list.json.gz', './city.list.json', ()=>{
//   console.log('unzip completed');
// });

app.get('/healthcheck', (req, res) => res.send("I'm alive!!!"));

app.get('/hello', (req, res) => res.send(`Hello ${req.query.name}!`));

app.get('/currentforcast', (req, res) => {
  const url = `http://api.openweathermap.org/data/2.5/weather?q=${req.query.city},${req.query.country}&units=metric&appid=${apiKey}`;  
  res.header("Access-Control-Allow-Origin", "*");
    return new Promise((resolve, reject)=>{
      request(url, {timeout: 10000}, (err, response, body)=>{
        if(err){
          reject(err);
        } else {
          resolve(body);
        }
    });
  })
  .then((body)=>{
    const weather = JSON.parse(body);
    const date = new Date();
    res.json({
      country : weather.sys.country,
      city : weather.name,
      temp : weather.main.temp,
      humidity : weather.main.humidity,
      date : `${date.getDate()}/${(date.getMonth())+1}/${date.getFullYear()}`
    });
  })
  .catch((err)=>{
    console.log('error:', err);
    res.status(500).send("something went wrong");
  })
})

const dictCityList = {};
const cityListJsonPromise = new Promise((resolve, reject)=>{
  fs.readFile('./city.list.json', 'utf8', (err, data)=>{
    if (err) reject(err);
    else{
      console.log("finish read file"); 
      const arrayCityList = JSON.parse(data);
      arrayCityList.forEach((el)=>{
        dictCityList[`${el.name}_${el.country}`] = el;
      });   
      resolve(dictCityList);
    };
  }); 
});

app.get('/forcast', (req, res)=>{
  if(req.query.days>5){
    res.status(422).send('Maximum days for any request should be up to 5 days');
    return;   
  }
  const date = new Date();  
  const city = (req.query.city).charAt(0).toUpperCase() + (req.query.city).slice(1).toLowerCase();
  const country = (req.query.country).toUpperCase();
  cityListJsonPromise.then((dictCityList)=>{
    const id = dictCityList[`${city}_${country}`].id;
    return(id); 
  })
  .then((id)=>{
    const url = `http://api.openweathermap.org/data/2.5/forecast?id=${id}&cnt=${req.query.days}&units=metric&appid=${apiKey}`;      
    return new Promise((resolve,reject)=>{
      request(url, {timeout: 10000}, (err, response, body)=>{
        if(err){
          reject(err);
        } 
        else{
          try{
            const weather = JSON.parse(body);
            const avgTempArr = [calculateTempAvg(weather)];    
            const csv = json2csv({ data: avgTempArr, fields: fields });
            const fileName = `${date.getDate()}-${(date.getMonth())+1}-${date.getFullYear()}.csv`;
            res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
            res.send(csv);
            resolve(); 
          }
          catch(err){
            reject(err);
          }      
        }
      });
    });  
  })
  .catch((err)=>{
    res.status(500).send("something went wrong");      
    console.log(err);
  })
});

function calculateTempAvg(weather){
  const date = new Date();      
  return {
    "Date" : `${date.getDate()}/${(date.getMonth())+1}/${date.getFullYear()}`,
    "Day temp" : getAvgWeather(weather.list, "temp"), 
    "Max temp" : getAvgWeather(weather.list, "temp_max"), 
    "Min temp" : getAvgWeather(weather.list, "temp_min")
  };
}

function getAvgOfArray(arr){
  let total = 0;  
  for(let i = 0; i<arr.length; i++){
    total += arr[i]
  };
  return Math.round(total/arr.length);
}

function getAvgWeather(weatherList, key){
  const tempArr = weatherList.map(data=>data.main[key]);
  return getAvgOfArray(tempArr);  
}

app.listen(8080, () => console.log('listening on port 8080!'))
