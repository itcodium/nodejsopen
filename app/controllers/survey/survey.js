var mongoose = require('mongoose')
    , async = require('async')
    , Survey= mongoose.model('Survey')
    , Question= mongoose.model('Question')
    , SurveyType= mongoose.model('SurveyType')
    , _ = require('underscore')
// var  UserAuthorization= require('../../../config/checkUserAuthorization');


/*

Survey:
    name: Nombre
    questions: []

----------------------------------
CUSTOM: - Texto libre

----------------------------------
LISTA:  - Pregunta
        - Items (etiqueta,valor)
        - label begin
        - Label End

----------------------------------

MATRIZ: - Pregunta
        - Columns Headers
        - Label + Columns Values

        Ejemplo:

          Column 1 - Column 2 - Column 3
Label 1    Value       Value      Value
Label 2    Value       Value      Value
Label 3    Value       Value      Value




* */
exports.test= function(req, res){
    console.log("req.query",req.query)
    // http://localhost:1616/survey?type=TEST
    SurveyType.findOne(req.query,function(err, item) {
        console.log("req.query",item)
        if (!item) {
            var st=new SurveyType(req.query);
            st.save();
            res.jsonp({result:"Se creo el tipo."});
        } else {
            res.jsonp({result:"El tipo ya existe."});
        }
    });

}


exports.getAllTypes= function(req, res){

    SurveyType.find(function(err, items) {
        console.log("req.query","getAllTypes",items);
            res.jsonp(items);
    });
}


exports.survey = function(req, res, next, id){
    console.log("* POPULATE *",id)
    var query = Survey.findById(id);
    query.populate("taxonomia").populate("institucion").exec(function (err, item){
        if (err) { return next(err); }
        if (!item) { return next(new Error("can't find survey")); }
        req.survey = item;
        return next();
    });
}

exports.show = function(req, res){
    console.log("exports.show: ",req.survey);
    res.jsonp(req.survey);
}


exports.all = function(req, res){
    console.clear();
    Survey.find(function(err, items) {
        if (err) {
            res.render('error', {status: 500});
        } else {
            res.jsonp(items);
        }
    }).populate("taxonomia").populate("institucion");
}


exports.update = function(req, res){

    var id = req.body._id,
        body = req.body;
/*
    console.log("> UPDATE polllist <",id,req);
    if(!UserAuthorization.isAuthorized(req,"","","ENCUESTA_GENERAR")){
        return res.status(401).jsonp({error:"No esta autorizado a realizar esta operacion."});
    }
    */

    console.log("> 2 <");
    Survey.findByIdAndUpdate(id, body, function(err, item) {
        if (err) {
            res.status(500).jsonp({error:err.message});
        }
        res.jsonp(item);

    });

}


exports.create = function (req, res) {
    console.log("new Survey req.body",req.body);
    /*
    var survey = new Survey(req.body)
    survey.save()
    res.jsonp(survey)
    */

    Survey.create(req.body, function (err, item) {
      if (err) return handleError(err);
      res.jsonp(item)
    });

}



exports.vote= function(req, res) {
    console.log("> addQuestion req.body <", req.body);
    var index=-1;


    Survey.findById(req.params.surveyId,function(err, items) {
        console.log("> items <", items);
        for (var i = 0; i < items.answers.length; i++) {
            console.log("> answers <", items);
            if(items.answers[i].ciudadano==req.body.ciudadano){
                index=i;
            }
        }



        if (index==-1){
            // req.body.survey.ciudadano= req.body.ciudadano;
             // var answer=req.body;
            items.answers.push(req.body   );

            items.save(function(itemSave,err) {
                res.jsonp(itemSave)
            });

        }else{
            res.jsonp({res: "El ciudadano ya ha votado."})
        }


    });


}

exports.addQuestion= function(req, res){
   console.log("> addQuestion req.body <",req.body);

     //console.log("*** Question req.body._id  *** ->",req.body);
    Survey.findById(req.params.surveyId,function(err, item) {
        var subItem= item.questions.id(req.body._id);

        console.log("**** addQuestion req.body ****",req.body);
        if(!subItem){
            var question=new Question(req.body);
            item.questions.push(question);
            item.save(function(newItem,err) {
                console.log('SAVE Success!',newItem);
                 res.jsonp(newItem)
            })

        }else{
            // subItem=req.body;
            subItem.question=req.body.question;
            subItem.type=req.body.type;
            subItem.list=req.body.list;
            subItem.columns=req.body.columns;
            subItem.labelRight=req.body.labelRight;
            subItem.labelLeft=req.body.labelLeft;

            item.save(function (err,newitem) {
                console.log('Update Success!',newitem);
                res.jsonp(newitem);
            });
        }
    });


}



exports.encuestaPorVotoCiudadano = function(req, res) {
    var query = Survey.findById(req.query.id);
    query.populate("taxonomia").populate("institucion").exec(function (err, item){
        if (!item) {
            res.status(400).send('No se encontro la encuesta.');
        }
        var pSuervey={}
        for (var i = 0; i < item.answers.length; i++) {
            if( item.answers[i].ciudadano==req.query.ciudadano){
                pSuervey.institucion=item.institucion;
                pSuervey.taxonomia=item.taxonomia;
                pSuervey.name=item.name;
                pSuervey.vigenciaDesde=item.vigenciaDesde;
                pSuervey.vigenciaHasta=item.vigenciaHasta;
                pSuervey.questions=item.answers[i].answers;
                break;
            }
        }
        res.json(pSuervey);
    });
}


exports.encuestaPorDefecto= function(req, res) {
     console.log("** Encuesta Por Defecto req.query **",req.query);
    var today=new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').substring(0,10)
    /*
    req.query.isDefault=true;
    req.query.isEnabled=true;
    req.query.vigenciaDesde={ $lt: today};
    req.query.vigenciaHasta={ $gte: today};
    */
    var query={
        isDefault:true,
        isEnabled:true,
        vigenciaDesde:{ $lt: today},
        vigenciaHasta:{ $gte: today}
    }

    Survey.find(query, function(error, surveys) {
        // surveys[0].answers[0].ciudadano
        // console.log("*) surveys - voted  ", uservoted(surveys,req.query.ciudadano) );
        // res.json(surveys);


        var voted=false;
        var surveyIndex=-1;
        var surveyIndexVoted=-1;
        if(typeof surveys!='undefined'){

            if(surveys.length>0){
                for (var h = 0; h < surveys.length; h++) {
                    voted=false;
                    for (var i = 0; i < surveys[h].answers.length; i++) {

                        for (var j = 0; j < surveys[h].answers.length; j++) {
                            console.log("+++ ciudadano-answers.ciudadano +++",req.query.ciudadano,surveys[h].answers[j].ciudadano);
                            if(req.query.ciudadano==surveys[h].answers[j].ciudadano){
                                voted=true;
                                surveyIndexVoted=h;
                                console.log("+++ VOTED +++",voted,surveyIndexVoted);
                                break;
                            }
                        }
                        if(voted==true){
                            surveyIndex=h;
                            break;
                        }
                    }

                    if(voted==false){
                        surveyIndex=h;
                        break;
                    }
                }
            }
        }
       console.log("+++ 2 VOTED 2 +++",voted,surveyIndexVoted);

        if(voted==false){
            if(surveyIndex!=-1){
                console.log("+++ 3 VOTED +++",voted,surveyIndexVoted);
                res.json({voted:voted,survey:surveys[surveyIndex]._id});
            }else{
                console.log("+++ 4 VOTED +++",voted,surveyIndexVoted);
                res.json({voted:voted,survey:-1});

            }
        }

        if(voted==true){
            console.log("+++ 5 VOTED +++",voted,surveys[surveyIndexVoted]._id);
            res.json({voted:voted,survey:surveys[surveyIndexVoted]._id});
        }

    });
};


function uservoted(surveys,ciudadano){
    var voted=false;
    var surveyIndex=-1;
    for (var h = 0; h < surveys.length; h++) {
        voted=false;
        for (var i = 0; i < surveys[h].answers.length; i++) {
            for (var j = 0; j < surveys[h].answers.length; j++) {
                if(ciudadano==surveys[h].answers[j].ciudadano){
                    voted=true;
                    break;
                }
            }
        }
        if(voted==false){
            surveyIndex=h;
            break;
        }
    }
    return voted;
}


exports.encuestaPorTramite = function(req, res) {
    var today=new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').substring(0,10)

    req.query.isEnabled=true;
    req.query.vigenciaDesde={ $lt: today};
    req.query.vigenciaHasta={ $gte: today};

    var query={isEnabled:true,
        vigenciaDesde: { $lt: today},
        vigenciaHasta:{ $gte: today},
        institucion : req.query.institucion,
        taxonomia:req.query.taxonomia
    }

   // console.log("** Encuesta Por Tramite req.query **",req.query);
    Survey.find(query, function(error, surveys) {
        var voted=false;
        var surveyIndex=-1;
        var surveyIndexVoted=-1;
        if(typeof surveys!='undefined'){
            if(surveys.length>0){
                for (var h = 0; h < surveys.length; h++) {
                    voted=false;
                    for (var i = 0; i < surveys[h].answers.length; i++) {
                        for (var j = 0; j < surveys[h].answers.length; j++) {
                            if(req.query.ciudadano==surveys[h].answers[j].ciudadano){
                                voted=true;
                                surveyIndexVoted=h;
                                break;
                            }
                        }
                    }
                    if(voted==false){
                        surveyIndex=h;
                        break;
                    }
                }
            }
        }

        if(voted==false){
            if(surveyIndex!=-1){
                res.json({voted:voted,survey:surveys[surveyIndex]._id});
            }else{
                res.json({voted:voted,survey:-1});
            }
        }

        if(voted==true){
            res.json({voted:voted,survey:surveys[surveyIndexVoted]._id});
        }

    });
};



