sap.ui.define([
    "../Service/TasaBackendService",
    'sap/ui/model/FilterOperator',
    'sap/ui/model/Filter',
    "sap/ui/core/syncStyleClass",
    'sap/ui/core/Fragment',
	"sap/ui/base/ManagedObject",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/integration/library",
    "../model/textValidaciones",
    "sap/m/MessageBox",
    "./General",
    "./Horometro",
    "./PescaDeclarada",
    "./Siniestro",
    "./Utils"
], function(
	TasaBackendService,
    FilterOperator,
    Filter,
    syncStyleClass,
    Fragment,
    ManagedObject,
    JSONModel,
    MessageToast,
    integrationLibrary,
    textValidaciones,
    MessageBox,
    General,
    Horometro,
    PescaDeclarada,
    Siniestro,
    Utils
) {
	"use strict";

	return ManagedObject.extend("com.tasa.mareaevento.controller.PescaDescargada", {

        constructor: function (oView, sFragName,o_this) {

            this._oView = oView;
            var oStore = jQuery.sap.storage(jQuery.sap.storage.Type.session);
            let flag = oStore.get("flagFragment");
            if(flag){
                this._oControl = sap.ui.xmlfragment(oView.getId(), "com.tasa.mareaevento.fragments."+ sFragName,this);
            }
            this._bInit = false;
            this._DataPopup;
            this._controler = o_this;
            this._TipoPesca = [];
            this._Estado = [];
            this._modelosPescaDescargada = {"Estado":"","NomPlanta":"","CodPlanta":"","NomEmb":"","Matricula":"","CodEmb":"","TipoPescaSel":"","FechaInicio" : "", "HoraInicio" : "","ListaDescargas":[], "TipoPesca" : [], "ListaEstado":[]}

            var Popup_Descarga_Modelo = new JSONModel();
            this._oView.setModel(Popup_Descarga_Modelo, "popup_descarga");
            Popup_Descarga_Modelo.setData(this._modelosPescaDescargada);

        },
        onButtonPress3: function (o_event) {
            console.log(o_event);
        },

        getcontrol: function () {
            return this._oControl;
        },

        validarBodegas: function () {
            this.oBundle = this._controler.getOwnerComponent().getModel("i18n").getResourceBundle();
            var bOk = true;
            var bodegas = this._controler._listaEventos[this._controler._elementAct].ListaBodegas;
            var cantTotal = 0;
            var mensaje = "";
            for (let index = 0; index < bodegas.length; index++) {
                const element = bodegas[index];
                var cantPesca = element.CantPesca ? Number(element.CantPesca) : Number(0);
                var capaMaxim = Number(element.CAPES);
                if (cantPesca) {
                    cantTotal += cantPesca;
                    if (cantPesca > capaMaxim) {
                        bOk = false;
                        mensaje = this.oBundle.getText("CAPABODEGASUPER");
                        this._controler.agregarMensajeValid("Error", mensaje);
                        break;
                    }
                }
            }

            if (bOk) {
                if (cantTotal == 0) {
                    bOk = false;
                    mensaje = this.oBundle.getText("CANTTOTBODNOCERO");
                    this._controler.agregarMensajeValid("Error", mensaje);
                }
            }

            return bOk;
        },

        validarBodegaPesca: function (verMensaje) {
            var bOk = true;
            this.oBundle = this._controler.getOwnerComponent().getModel("i18n").getResourceBundle();
            var eventoActual = this._controler._listaEventos[this._controler._elementAct];
            var cantPesca = eventoActual.ListaPescaDeclarada.length;
            var cantTotBod = eventoActual.CantTotalPescDecla;
            if ((cantTotBod > 1 && cantPesca == 0) || (cantTotBod == 0 && cantPesca > 0)) {
                if (cantPesca > 0) {
                    let that = this;
                    MessageBox.confirm("Las bodegas están vacías y existe pesca declarada, ¿Desea eliminar la pesca declarada?", {
                    title: "Eliminar pesca descargada",
                    onclose: function(sOk){
                        if(sOk == "Ok"){
                            that.eliminarPescaDeclarada();
                        }

                    }

                })
                    // if (!this.oApproveDialog) {
                    //     this.oApproveDialog = new Dialog({
                    //         type: DialogType.Message,
                    //         title: "Confirm",
                    //         content: new Text({ text: "Do you want to submit this order?" }),
                    //         beginButton: new Button({
                    //             type: ButtonType.Emphasized,
                    //             text: "Submit",
                    //             press: function () {
                    //                 this.eliminarPescaDeclarada();
                    //                 MessageToast.show("Submit pressed!");
                    //                 this.oApproveDialog.close();
                    //             }.bind(this)
                    //         }),
                    //         endButton: new Button({
                    //             text: "Cancel",
                    //             press: function () {
                    //                 this.oApproveDialog.close();
                    //             }.bind(this)
                    //         })
                    //     });
                    // }
                } else {
                    mensaje = this.oBundle.getText("BODDECPESCANODEC");
                    this._controler.agregarMensajeValid("Error", mensaje);
                }
                bOk = false;
            }
            return bOk;
        },

        eliminarPescaDeclarada: function () {
            var eventoActual = this._controler._listaEventos[this._controler._elementAct];
            var pescaDeclarada = eventoActual.ListaPescaDeclarada;
            var ePescaDeclarada = eventoActual.eListaPescaDeclarada;
            for (let index = 0; index < pescaDeclarada.length; index++) {
                const element = pescaDeclarada[index];
                if (element.indicador == "E") {
                    var ePescaDeclarada = {
                        CDSPC: element.CDSPC
                    };
                    ePescaDeclarada.push(ePescaDeclarada);
                }
            }
            eventoActual.ObseAdicional = null;
            eventoActual.Observacion = null;
            pescaDeclarada = [];
            //refrescar modelo
        },

        validarDatosEvento:async function(){
            var DetalleMarea = this._controler._FormMarea;//modelo detalle marea
            var soloLectura = this._controler._soloLectura;//modelo data session
            var tieneErrores = DetalleMarea.TieneErrores;//modelo detalle marea
            var listaEventos = this._controler._listaEventos;
            var eventoActual = this._controler._listaEventos[this._controler._elementAct];//modelo evento actual
            var visible = this._controler.modeloVisible;//modelo visible
            var motivoEnCalend = ["1", "2", "8"];//motivos de marea con registros en calendario

            if(!soloLectura && !tieneErrores){
                var tipoEvento = eventoActual.CDTEV;
                var motMarea = this._controler._motivoMarea
                var bOk = await this._controler.Dat_General.validarCamposGeneral(true);
                var eveActual = this._controler._elementAct;
                var cantEventos = listaEventos.length;
                if(bOk && visible.TabHorometro){
                    bOk = this._controler.Dat_Horometro.validarLecturaHorometros();
                    if(bOk){
                        bOk = await this._controler.Dat_Horometro.validarHorometrosEvento();
                    }
                }

                if(bOk && tipoEvento == "6" && motivoEnCalend.includes(motMarea)){
                    visible.VisibleDescarga = false;
                    visible.FechFin = false;
                    var fechIni = eventoActual.FechIni;
                    bOk = this._controler.Dat_General.verificarTemporada(motMarea, fechIni);
                }

                if(bOk && tipoEvento == "3"){
                    visible.VisibleDescarga = true;
                    bOk = this._controler.Dat_PescaDeclarada.validarPescaDeclarada(true);
                    if(bOk && motMarea == "1"){
                        this._controler.Dat_Horometro.calcularCantTotalBodegaEve();
                        bOk = this.validarBodegas();
                        if(bOk){
                            bOk = this.validarBodegaPesca(true);
                        }
                        if(bOk){
                            bOk = this._controler.Dat_PescaDeclarada.validarPorcPesca();
                        }
                        this._controler.Dat_PescaDeclarada.calcularPescaDeclarada();
                    } else if(bOk && motMarea == "2"){
                        this._controler.Dat_PescaDeclarada.calcularCantTotalPescDeclEve();
                    }
                    if(bOk){
                        this._controler.Dat_PescaDeclarada.validarCantidadTotalPesca();
                    }
                    if(bOk){
                        bOk = this._controler.Dat_General.validarIncidental();
                        if(bOk){
                            this.cargarIncidental();
                        }
                    }

                    if(eventoActual.CantTotalPescDecla){
                        eventoActual.CantTotalPescDeclaM = eventoActual.CantTotalPescDecla;
                    }else{
                        eventoActual.CantTotalPescDeclaM = null;
                    }

                    if(eveActual < cantEventos){
                        var cantTotalDec = eventoActual.CantTotalPescDecla;
                        var cantTotalDecDesc = 0;
                        for (let index = (eveActual + 1); index < cantEventos; index++) {
                            const element = listaEventos[index];
                            if(element.TipoEvento == "3"){
                                visible.VisibleDescarga = false;
                                cantTotalDec += element.CantTotalPescDecla;
                            } else if(element.TipoEvento == "5"){
                                visible.VisibleDescarga = false;
                                if (index == (cantEventos - 1)) {
                                    if(cantTotalDec < 0 || cantTotalDec == 0){
                                        element.CDMNP = "7";
                                        element.Editado = true;
                                        // falta mensaje
                                        mensaje = this.oBundle.getText("EVEARRCAMBMOTNOPES");
                                        this._controler.agregarMensajeValid("Error", mensaje);
                                    }
                                } else {
                                    element.CDMNP = null;
                                    element.Editado = true;
                                }
                            } else if(element.TipoEvento == "6"){
                                visible.VisibleDescarga = false;
                                visible.FechFin = false;
                                if(cantTotalDec < 0 || cantTotalDec == 0){
                                    bOk = false;
                                    //falta mesaje
                                    mensaje = this.oBundle.getText("EXIEVEDESCPESDECNOVAL");
                                    this._controler.agregarMensajeValid("Error", mensaje);
                                    break;
                                } else {
                                    if(element.ListaPescaDescargada[0].CantPescaDeclarada){
                                        cantTotalDecDesc += element.ListaPescaDescargada[0].CantPescaDeclarada;
                                    }
                                }
                            } else if(element.TipoEvento == "1"){
                                visible.VisibleDescarga = true;
                                if(cantTotalDec > 0 && cantTotalDecDesc == 0){
                                    //falta mensaje
                                    mensaje = this.oBundle.getText("EXIPESDECNOEXIPESDES");
                                    this._controler.agregarMensajeValid("Error", mensaje);
                                }

                            }
                        }
                    }
                }

                if(bOk && tipoEvento == "6"){
                    visible.VisibleDescarga = false;
                    visible.FechFin = false;
                    bOk = this.validarPescaDescargada();
                    if(eventoActual.ListaPescaDescargada[0].CantPescaModificada){
                        eventoActual.CantTotalPescDescM = eventoActual.ListaPescaDescargada[0].CantPescaModificada;
                    }else{
                        eventoActual.CantTotalPescDescM = null;
                    }
                    this.obtenerTipoDescarga(eveActual);
                }

                if(bOk && tipoEvento == "8"){
                    visible.VisibleDescarga = true;
                    bOk = this._controler.Dat_Siniestro.validarSiniestros();
                }
            }
            this._controler.modeloVisibleModel.refresh();
            return bOk;
        },

        cargarIncidental: function(){
            var bOk = true;
            var ndInciden = []; // lista de incidental viene del modelo de alejandro
            var ndIncidenTemp = []; // lista de incidental temp viene del modelo de alejandro
            var Utils = {};// objeto utils
            if(ndIncidenTemp.length > 0){
                var tmp = [];
                for (let index = 0; index < ndIncidenTemp.length; index++) {
                    const element = ndIncidenTemp[index];
                    if(element.Nrenv != Utils.NroEvento_Incidental){
                        tmp.push(element);
                    }
                }
                ndIncidenTemp = tmp;
            }
            if(ndInciden.legnth > 0){
                for (let index = 0; index < ndInciden.length; index++) {
                    const element = ndInciden[index];
                    var newObject = {
                        Cdspc: element.Cdspc,
                        Dsspc: element.Dsspc,
                        Nrenv: element.Nrenv,
                        Nrmar: element.Nrmar,
                        Pcspc: element.Pcspc
                    };
                    ndIncidenTemp.push(newObject);  
                }
            }
            return bOk;
        },
        obtenerTipoDescarga:function(evento){
            let eventoElement = this._controler._listaEventos[evento];
            let indPropiedad = this._controler._motivoMarea;
            let indPropPlanta = eventoElement.IndPropPlanta;
            let tipoDescarga = eventoElement.TipoDescarga;

            eventoElement.ListaPescaDescargada[0].TipoDesc = null;
            
            if (indPropiedad == "T") {
                eventoElement.ListaPescaDescargada[0].TipoDesc = "C";
            } else if (indPropiedad == "P") {
                if (indPropPlanta == "T" && tipoDescarga == "V") {
                    eventoElement.ListaPescaDescargada[0].TipoDesc = "V";
                }
            }	

        },

        validarPescaDescargada: function(){
            var bOk = true;
            this.oBundle = this._controler.getOwnerComponent().getModel("i18n").getResourceBundle();
            var valorAtributo = null;
            var DetalleMarea = this._controler._FormMarea;//modelo detalle de marea
            var eventoActual = this._controler._listaEventos[this._controler._elementAct];//modelo evento actual
            var PescaDescargada = eventoActual.ListaPescaDescargada[0]; //actual pesca descargada
            var tipoDescarga = eventoActual.CDTDS;// VALOR SE LLENA EN NUEVO EVENTO
            var indPropPlanta = this._controler._listaEventos[this._controler._elementAct].INPRP;
            var motMarea = this._controler._motivoMarea;
            var centEmba = DetalleMarea.WERKS;
            var atributos = ["CantPescaDescargada", "CantPescaDeclarada"];
            var mensaje = "";
            if(eventoActual.ListaPescaDescargada.length > 0){
                if(indPropPlanta == "T"){
                    if(PescaDescargada.CDSPC == "0000000000"){
                        mensaje = this.oBundle.getText("SELECCESPECIE");
                        this._controler.agregarMensajeValid("Error", mensaje);
                        bOk = false;
                        return false;
                    }
                    if(PescaDescargada.INDTR == "N"){
                        PescaDescargada.Nro_descarga = tipoDescarga + centEmba;
                        //Refrescar modelo
                        this._oView.getModel("eventos").updateBindings(true);
                    }
                    PescaDescargada.FECCONMOV = eventoActual.FechProduccion;
                    PescaDescargada.CDPTA = eventoActual.CDPTA;
                }else if(indPropPlanta == "P"){
                    if(motMarea == "1"){
                        atributos = ["CantPescaDeclarada"];
                    }else{
                        atributos = ["CantPescaDeclarada", "CDPDG", "FECCONMOV"];
                    }
                    eventoActual.FechProduccion = PescaDescargada.FECCONMOV;
                    eventoActual.CantTotalPescDecla = PescaDescargada.CNPCM;
                    //refrescar modelo
                    this._oView.getModel("eventos").updateBindings(true);
                    if (PescaDescargada.Nro_descarga == "") {
                        mensaje = this.oBundle.getText("SELECCDESCARGA");
                        this._controler.agregarMensajeValid("Error", mensaje);
                        bOk = false;
                        return false;
                    }
                }

                if(atributos){
                    var actualPescaDescargada = PescaDescargada//actual pesca descargada
                    for (let index = 0; index < atributos.length; index++) {
                        const element = atributos[index];
                        var valor = actualPescaDescargada[element];
                        if(!valor){
                            bOk = false;
                            let nomCampo = this._controler.obtenerMensajesCamposValid(element);
                            mensaje = this.oBundle.getText("MISSINGFIELD", [nomCampo]);
                            this._controler.agregarMensajeValid("Error", mensaje);
                        }
                        
                    }
                }

                if(bOk){
                    if(indPropPlanta == "T"){
                        PescaDescargada.PESACUMOD = PescaDescargada.CNPDS;
                        //refrescar modelo
                        this._oView.getModel("eventos").updateBindings(true);
                    }
                    if(PescaDescargada.PESACUMOD < 0){
                        bOk = false;
                        mensaje = this.oBundle.getText("CANTDESCARGANOCERO");
                        this._controler.agregarMensajeValid("Error", mensaje);
                    }

                    if(bOk){
                        if(PescaDescargada.CNPCM < 0){
                            bOk = false;
                            mensaje = this.oBundle.getText("CANTDECLDESCNOCERO");// no se encontro en el pool de mensajes CANTDECLDESCNOCERO
                            this._controler.agregarMensajeValid("Error", mensaje);
                        }

                        if(bOk){
                            bOk = this._controler.validarCantPescaDeclDesc(); //llamar a metodo validarCantPescaDeclDesc
                            if(bOk && motMarea == "2" && indPropPlanta == "P"){
                                if(PescaDescargada.PESACUMOD != PescaDescargada.BckCantPescaModificada){
                                    if(PescaDescargada.PESACUMOD > PescaDescargada.BckCantPescaModificada){
                                        PescaDescargada.INDEJ = "R";
                                    }else{
                                        bOk = false;
                                        mensaje = this.oBundle.getText("ERRORCANTREINT");
                                        this._controler.agregarMensajeValid("Error", mensaje);
                                    }
                                }
                            }
                        }
                    }
                }else{
                    bOk = false;
                }
            }
            return bOk;
        },

        buscarDescarga: async function (oEvent) {
            await this.obtenerTipoPesca();
            await this.obtenerEstadoDesc();
            this._oView.getModel("popup_descarga").setProperty("/TipoPesca", this._TipoPesca.data);
            this._oView.getModel("popup_descarga").setProperty("/ListaEstado", this._Estado.data);
            if(this._controler._motivoMarea == "1"){
                this._oView.getModel("popup_descarga").setProperty("/TipoPescaSel", "D");
                this._oView.getModel("popup_descarga").setProperty("/FechaInicio", this._controler._listaEventos[this._controler._elementAct].FechProduccion);
                this._oView.getModel("popup_descarga").setProperty("/CodEmb", this._controler._FormMarea.CDEMB);
                this._oView.getModel("popup_descarga").setProperty("/Matricula", this._controler._FormMarea.MREMB);
                this._oView.getModel("popup_descarga").setProperty("/NomEmb", this._controler._FormMarea.NMEMB);
                this._oView.getModel("popup_descarga").setProperty("/CodPlanta", "FP12");
                this._oView.getModel("popup_descarga").setProperty("/NomPlanta", "TASA CHD");
                this._oView.getModel("popup_descarga").setProperty("/Estado", "N");
                this._oView.getModel("popup_descarga").setProperty("/HoraInicio", this._controler._listaEventos[this._controler._elementAct].HIEVN);

            }else if(this._controler._motivoMarea == "2"){
                this._oView.getModel("popup_descarga").setProperty("/TipoPescaSel", "I");
                this._oView.getModel("popup_descarga").setProperty("/FechaInicio", this._controler._listaEventos[this._controler._elementAct].FechProduccion);
                this._oView.getModel("popup_descarga").setProperty("/CodEmb", this._controler._FormMarea.CDEMB);
                this._oView.getModel("popup_descarga").setProperty("/Matricula", this._controler._FormMarea.MREMB);
                this._oView.getModel("popup_descarga").setProperty("/NomEmb", this._controler._FormMarea.NMEMB);
                this._oView.getModel("popup_descarga").setProperty("/CodPlanta", this._controler._listaEventos[this._controler._elementAct].WERKS);
                this._oView.getModel("popup_descarga").setProperty("/NomPlanta", this._controler._listaEventos[this._controler._elementAct].DESCR);
                this._oView.getModel("popup_descarga").setProperty("/HoraInicio", this._controler._listaEventos[this._controler._elementAct].HIEVN);
                this._oView.getModel("popup_descarga").setProperty("/Estado", "N");
                

            }
            this.getDialogConsultaDescarga().open();
            this.consultarDescarga();
        },
        getDialogConsultaDescarga: function () {

            if (!this.oDialog_consultaDesc) {

                this.oDialog_consultaDesc = sap.ui.xmlfragment("com.tasa.mareaevento.fragments.Popup_buscarDescarga", this);

                this._oView.addDependent(this.oDialog_consultaDesc);

            }

            return this.oDialog_consultaDesc;

        },

        cerrarPopUpDescarga: function (oEvent) {
            this._oView.getModel("popup_descarga").setProperty("/ListaDescargas", []);
            this.getDialogConsultaDescarga().close();
        },

        consultarDescarga: async function () {
            let options = [];
            let comandos = [];
            let option = [];
            let nro_descarga = sap.ui.getCore().byId("pbd_nro_descarga").getValue();
            let cod_embarcacion = sap.ui.getCore().byId("pbd_cod_embarcacion").getValue();
            let matricula = sap.ui.getCore().byId("pbd_matricula").getValue();
            let nom_embarcacion = sap.ui.getCore().byId("pbd_nom_embarcacion").getValue();
            let cod_planta = sap.ui.getCore().byId("pbd_cod_planta").getValue();
            let nom_planta = sap.ui.getCore().byId("pbd_nom_planta").getValue();
            let fecha_inicio = Utils.strDateToSapDate(sap.ui.getCore().byId("pbd_fecha_inicio").getValue());
            let hora_inicio = Utils.strHourToSapHo(sap.ui.getCore().byId("pbd_hora_inicio").getValue());
            let tipo_Pesca = sap.ui.getCore().byId("pbd_tipo_pesca").getSelectedKey();
            let estado = sap.ui.getCore().byId("pbd_estado").getSelectedKey();

            console.log("dato recuperado : " + nro_descarga + " - " + cod_embarcacion + " - " + matricula + " - " + nom_embarcacion + " - "
            + cod_planta + " - " + nom_planta + " - " + fecha_inicio + " - " + tipo_Pesca + " - " + estado);

            if(tipo_Pesca){
                options.push({
                    cantidad: "1",
                    control:"COMBOBOX",
                    key:"CDTPC",
                    valueHigh: "",
                    valueLow:tipo_Pesca
                });
          
            }
            if(estado){
                options.push({
                    cantidad: "1",
                    control:"COMBOBOX",
                    key:"ESDES",
                    valueHigh: "",
                    valueLow:estado
                });
          
            }
            if(nro_descarga){
                options.push({
                    cantidad: "10",
                    control:"INPUT",
                    key:"NRDES",
                    valueHigh: "",
                    valueLow:nro_descarga
                });
          
            }
            if(cod_embarcacion){
                options.push({
                    cantidad: "10",
                    control:"INPUT",
                    key:"CDEMB",
                    valueHigh: "",
                    valueLow:cod_embarcacion
                });
          
            }
            if(matricula){
                options.push({
                    cantidad: "12",
                    control:"INPUT",
                    key:"MREMB",
                    valueHigh: "",
                    valueLow:matricula
                });
          
            }
            if(nom_embarcacion){
                options.push({
                    cantidad: "60",
                    control:"INPUT",
                    key:"NMEMB",
                    valueHigh: "",
                    valueLow:nom_embarcacion
                });
          
            }
            if(cod_planta){
                options.push({
                    cantidad: "4",
                    control:"INPUT",
                    key:"CDPTA",
                    valueHigh: "",
                    valueLow:cod_planta
                });
          
            }
            if(nom_planta){
                options.push({
                    cantidad: "60",
                    control:"INPUT",
                    key:"DSPTA",
                    valueHigh: "",
                    valueLow:nom_planta
                });
          
            }
            if(fecha_inicio){
                options.push({
                    cantidad: "8",
                    control:"INPUT",
                    key:"FIDES",
                    valueHigh: "",
                    valueLow:fecha_inicio
                });
          
            }
            console.log(this._controler._nroEvento);
            let s = await this.cargar_servicios_pescaDesc(matricula, nom_embarcacion, cod_planta, nom_planta, fecha_inicio, this._controler.getCurrentUser(),nro_descarga);
            let listaDes_RFC = JSON.parse(this._DataPopup[0]).data;
            let lista_popup = []
            for (let index = 0; index < listaDes_RFC.length; index++) {
                const element = listaDes_RFC[index];
                let p_fecha_inicio = sap.ui.getCore().byId("pbd_fecha_inicio").getValue();
                let p_hora_inicio = sap.ui.getCore().byId("pbd_hora_inicio").getValue();
                let p_fecha_hora = Utils.strDateHourToDate(p_fecha_inicio,p_hora_inicio);
                let s_fecha_hora = Utils.strDateHourToDate(element.FIDES,element.HIDES);
                if(s_fecha_hora>p_fecha_hora){
                    lista_popup.push(element);
                }
            }
            this._oView.getModel("popup_descarga").setProperty("/ListaDescargas", lista_popup);
            this._oView.getModel("popup_descarga").updateBindings(true);


        },
        obtenerTipoPesca: async function () {
            let serv_tipopesca = TasaBackendService.obtenerDominio("ZCDTPC");
            let that = this;
            await Promise.resolve(serv_tipopesca).then(values => {
                that._TipoPesca = values.data[0];
            }).catch(reason => {

            });

        },
        obtenerEstadoDesc: async function () {
            let serv_estado = TasaBackendService.obtenerDominio("ZESDES");
            let that = this;
            await Promise.resolve(serv_estado).then(values => {
                that._Estado = values.data[0];
            }).catch(reason => {

            });

        },
        consultarDescargaCHD: async function (oEvent) {
            let options = [];
            let comandos = [];
            let matricula = sap.ui.getCore().byId("pbdCHD_matricula").getValue();
            let nom_embarcacion = sap.ui.getCore().byId("pbdCHD_nom_embarcacion").getValue();
            let cod_planta = sap.ui.getCore().byId("pbdCHD_cod_planta").getValue();
            let nom_planta = sap.ui.getCore().byId("pbdCHD_nom_planta").getValue();
            let fecha_inicio = sap.ui.getCore().byId("pbdCHD_fecha_inicio").getValue();

            console.log("dato recuperado : " + matricula + " - " + nom_embarcacion + " - "
            + cod_planta + " - " + nom_planta + " - " + fecha_inicio);

            if(matricula){
                options.push({
                    cantidad: "12",
                    control:"INPUT",
                    key:"MREMB",
                    valueHigh: "",
                    valueLow:matricula
                });
          
            }
            if(nom_embarcacion){
                options.push({
                    cantidad: "60",
                    control:"INPUT",
                    key:"NMEMB",
                    valueHigh: "",
                    valueLow:nom_embarcacion
                });
          
            }
            if(cod_planta){
                options.push({
                    cantidad: "4",
                    control:"INPUT",
                    key:"CDPTA",
                    valueHigh: "",
                    valueLow:cod_planta
                });
          
            }
            if(nom_planta){
                options.push({
                    cantidad: "60",
                    control:"INPUT",
                    key:"DSPTA",
                    valueHigh: "",
                    valueLow:nom_planta
                });
          
            }
            if(fecha_inicio){
                options.push({
                    cantidad: "8",
                    control:"INPUT",
                    key:"FIDES",
                    valueHigh: "",
                    valueLow:fecha_inicio
                });
          
            }
            console.log(this._controler._nroEvento);
            let s = await this.cargar_servicios_pescaDescCHD(options);
            this._oView.getModel("popup_descarga").setProperty("/ListaDescargas", JSON.parse(this._DataPopup[0]).data);
            this._oView.getModel("popup_descarga").updateBindings(true);


        },

        cargar_servicios_pescaDesc :function (matricula, nom_embarcacion, cod_planta, nom_planta, fecha_inicio, user,nro_descarga){
            let self = this;
            var s1 = TasaBackendService.obtenerListaDescargaPopUp(matricula, nom_embarcacion, cod_planta, nom_planta, fecha_inicio, user,nro_descarga);
            return Promise.all([s1]).then(values => {
                self._DataPopup = values;
                console.log(self._DataPopup);
                return true;
            }).catch(reason => {
                return false;
            })
        },

        cargar_servicios_pescaDescCHD :function (options){
            let self = this;
            var s1 = TasaBackendService.obtenerListaDescargaCHDPopUp(options);
            return Promise.all([s1]).then(values => {
                self._DataPopup = values;
                console.log(self._DataPopup);
                return true;
            }).catch(reason => {
                return false;
            })

        },
        obtenerItem :function (event){
            let mod = event.getSource().getBindingContext("popup_descarga");
            let data  =mod.getObject();
            let ListaPescDesc = this._oView.getModel("eventos").getData().ListaPescaDescargada[0];
            ListaPescDesc.Nro_descarga = data.NRDES;
            ListaPescDesc.TICKE = data.TICKE;
            ListaPescDesc.CDSPC = data.CDSPC;
            ListaPescDesc.DSSPC = data.DSSPC;
            ListaPescDesc.CNPDS = data.CNPDS;
            this._oView.getModel("eventos").updateBindings(true);
            if(this._controler._motivoMarea == "1"){
                //this._controler.distribuirDatosDescarga(data);
                this._controler.distribuirDatosDescargaCHD(data);
            }else if(this._controler._motivoMarea == "2"){
                //this._controler.distribuirDatosDescargaCHD(data);
                this._controler.distribuirDatosDescarga(data);
            }

            this.getDialogConsultaDescarga().close();
            //console.log("Holaaaaaaaaaaaaaa");
        },
        eliminarDesacarga: function(event){
            let pescaDesc = this._oView.getModel("eventos").getData().ListaPescaDescargada;
            let desc = pescaDesc[0].Nro_descarga;
            let self = this;

            let ListaPescaDescElim = this._oView.getModel("eventos").getData().ListaPescaDescargada;
            let atrb_nuevoDes = ListaPescaDescElim[0].EsNuevo ? true : false;

            if(atrb_nuevoDes && ListaPescaDescElim[0].EsNuevo == true){ // se setea nuevo a la hora de creacion
                for (var i = 0; i < ListaPescaDescElim.length; i++) {
                    if(ListaPescaDescElim[i].Nro_descarga == desc){
                        ListaPescaDescElim.splice(i, 1);
                    }
                        
                }
                ListaPescaDescElim[0] = {};
                ListaPescaDescElim[0].EsNuevo = true;
                ListaPescaDescElim[0].INDTR = "N";
                ListaPescaDescElim[0].CNPCM = textValidaciones.CantPescaDeclaRestante;
                ListaPescaDescElim[0].CantPescaDeclarada = textValidaciones.CantPescaDeclaRestante;
                if (this._controler._motivoMarea == "1") {
					ListaPescaDescElim[0].CDTPC = "D";
				} else if (this._controler._motivoMarea =="2") {
					ListaPescaDescElim[0].CDTPC = "I";
				}

                if (this._controler._listaEventos[this._controler._elementAct].INPRP == "T") { //Descarga en planta tercera
					ListaPescaDescElim[0].CDSPC = "0000000000";
					ListaPescaDescElim[0].Nro_descarga = this._controler._nroDescarga + "T";
                    ListaPescaDescElim[0].FECCONMOV  = this._oView.byId("dtf_FechaProduccion").getValue(); //Obtengo el valor de fecha de contabilizacion
					ListaPescaDescElim[0].CDPTA = this._controler._codPlanta; //Obtengo la planta del evento
				} else if (this._controler._listaEventos[this._controler._elementAct].INPRP == "P") { //Descarga en planta propia
                    this._oView.byId("pdt_col_BuscarDesc").setVisible(true);
                    this._oView.byId("pdCHD_col_BuscarDesc").setVisible(true);
                    this._oView.byId("pdt_col_EliminarDesc").setVisible(false);
                    this._oView.byId("pde_col_EliminarDesc").setVisible(false);
                    this._oView.byId("pdCHD_col_EliminarDesc").setVisible(false);

                        ListaPescaDescElim[0].INDTR = "E";
						ListaPescaDescElim[0].INDEJ = "C";
				}

                this._oView.getModel("eventos").setProperty("/ListaPescaDescargada",ListaPescaDescElim);

            }else{
                let sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer";
                if (this._controler._listaEventos[this._controler._elementAct].INPRP == "T") {
					MessageBox.show(
                        '�Realmente desea eliminar el registro de pesca descargada?',
                        {
                            icon: MessageBox.Icon.WARNING,
                            title: "Eliminar pesca descargada",
                            actions: [MessageBox.Action.OK, MessageBox.Action.NO],
                            emphasizedAction: MessageBox.Action.OK,
                            styleClass: "sapUiSizeCompact",
                            onClose: function (sAction) {
                                if(sAction == "OK"){
                                    self.eliminarPescaDescargada();
                                }
                            }
                        }
                    );
				} else if (this._controler._listaEventos[this._controler._elementAct].INPRP =="P") { //Descarga en planta propia
					if (this._controler._motivoMarea == "1") {
						MessageBox.show(
                            '�Realmente desea eliminar el registro de pesca descargada?',
                            {
                                icon: MessageBox.Icon.WARNING,
                                title: "Eliminar pesca descargada",
                                actions: [MessageBox.Action.OK, MessageBox.Action.NO],
                                emphasizedAction: MessageBox.Action.OK,
                                styleClass: sResponsivePaddingClasses,
                                onClose: function (sAction) {
                                    if(sAction == "OK"){
                                        self.eliminarPescaDescargada();
                                    }
                                }
                            }
                        );
					} else if (this._controler._motivoMarea == "2") {
						MessageBox.show(
                            '�Realmente desea eliminar el registro de pesca descargada?,\n este proceso es irreversible y puede durar varios minutos.',
                            {
                                icon: MessageBox.Icon.WARNING,
                                title: "Eliminar pesca descargada",
                                actions: [MessageBox.Action.OK, MessageBox.Action.NO],
                                emphasizedAction: MessageBox.Action.OK,
                                styleClass: sResponsivePaddingClasses,
                                onClose: function (sAction) {
                                    if(sAction == "OK"){
                                        self.eliminarPescaDescargada();
                                    }
                                }
                            }
                        );
					}
				}
                
                
            }

            
        },
        eliminarPescaDescargada : async function(){
            let bOk = true;
            let ListaPescaDescElim = [];

            if (this._controler._listaEventos[this._controler._elementAct].INPRP =="P" && this._controler._motivoMarea == "2") {
                bOk = await this.anularEventoDescarga(this._controler._nroDescarga, false);
            }
            if (bOk) {
                if (this._controler._listaEventos[this._controler._elementAct].INPRP =="T" || this._controler._indicadorProp == "T") {
                    // precioMareaElim.setEspecie(pescaDescargadaElement.getEspecie());  --- Revisar mas a fondo si es necesario.
                    // wdContext.nodePreciosMareaEliminados().addElement(
                    //     precioMareaElim);
                }
                ListaPescaDescElim[0].INDTR = "N";
                ListaPescaDescElim[0].EsNuevo = true;
                ListaPescaDescElim[0].CNPCM = textValidaciones.CantPescaDeclaRestante;
                if (this._controler._motivoMarea == "1") {
					ListaPescaDescElim[0].CDTPC = "D";
				} else if (this._controler._motivoMarea =="2") {
					ListaPescaDescElim[0].CDTPC = "I";
				}

                if (this._controler._listaEventos[this._controler._elementAct].INPRP == "T") { //Descarga en planta tercera
					ListaPescaDescElim[0].CDSPC = "0000000000";
					ListaPescaDescElim[0].Nro_descarga = this._controler._nroDescarga + "T";
                    ListaPescaDescElim[0].FECCONMOV  = this._oView.byId("dtf_FechaProduccion").getValue(); //Obtengo el valor de fecha de contabilizacion
					ListaPescaDescElim[0].CDPTA = this._controler._codPlanta; //Obtengo la planta del evento
				} else if (this._controler._listaEventos[this._controler._elementAct].INPRP == "P") { //Descarga en planta propia
                    this._oView.byId("pdt_col_BuscarDesc").setVisible(true);
                    this._oView.byId("pdt_col_EliminarDesc").setVisible(false);

                        ListaPescaDescElim[0].INDTR = "E";
						ListaPescaDescElim[0].INDEJ = "C";
				}

                this._oView.getModel("eventos").setProperty("/ListaPescaDescargadaElim",ListaPescaDescElim);
            }

            //MessageToast.show("hOLA METODO");

        },
        anularEventoDescarga : async function(nroDescarga, anularEvento){
            let bOk = await this.anularDescargaRFC(nroDescarga);
            
            if (!bOk) {
                MessageBox.error("Lo sentimos hubo un error al eliminar la descarga");
            } else {
                if (anularEvento) {
                    //ELIMINAR DE TABLA EVENTO
                    let elimDesc =  await TasaBackendService.eliminarPescaDescargada(this._controler._nroMarea, this._controler._nroEvento, this._controler.getCurrentUser());
                    let consulta  = await Promise.all([elimDesc]).then(values => {
                        return true; }).catch(reason => { return false; })

                } else {
                    //METODO ACTUALIZAR TABLA
                    let ActualizDesc =  await TasaBackendService.actualizarPescaDescargada(this._controler._nroMarea, this._controler._nroEvento, this._controler.getCurrentUser());
                    let consulta     =  await Promise.all([ActualizDesc]).then(values => {
                        return true; }).catch(reason => { return false; })
                    
                }
            }
            return bOk;
        },
        anularDescargaRFC : async function(nroDescarga){
            let anularDesc =  await TasaBackendService.anularDescargaRFC(nroDescarga);
            let consulta  = await Promise.all([anularDesc]).then(values => {
                        if(values.mensaje == "E"){
                            return false;
                        }else{
                            return true;
                        }
                         
                    }).catch(reason => { return false; })
            return consulta;

        }


	});
});