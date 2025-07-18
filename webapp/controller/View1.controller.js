sap.ui.define([
    "sap/ui/core/mvc/Controller",
     "sap/m/MessageToast",
      "sap/ui/model/json/JSONModel"
], (Controller,MessageToast,JSONModel) => {
    "use strict";

    return Controller.extend("com.docqanda.docqa.controller.View1", {
        onInit() {
            this.getView().setModel(new JSONModel({ answer: "", highlights: [] }));
            this.docID = null;
        },
        
        onFileChange: function (oEvent) {
          const file = oEvent.getParameter("files")[0];
          if (!file) return;
    
          this._fileToBase64(file).then(function (base64) {
            const filename = file.name;
    
            // Upload Document using jQuery.ajax
            $.ajax({
              url: "./docqaDest/odata/v4/doc-qa/UploadDocument",
              method: "POST",
              contentType: "application/json",
              data: JSON.stringify({ filename, content: base64 }),
              success: function (uploadedDocID) {
                //this.docID = uploadedDocID;
                this.docID = uploadedDocID.value;
                MessageToast.show("PDF uploaded. Generating embeddings...");
    
                // Generate Embeddings
                $.ajax({
                  url: "./docqaDest/odata/v4/doc-qa/GenerateEmbeddings",
                  method: "POST",
                  contentType: "application/json",
                  data: JSON.stringify({ docID: this.docID }),
                  success: function () {
                    MessageToast.show("Embeddings generated. You can now ask a question.");
                  }.bind(this),
                  error: function (xhr) {
                    console.error(xhr.responseText);
                    MessageToast.show("Embedding failed: " + xhr.responseText);
                  }
                });
    
              }.bind(this),
              error: function (xhr) {
                console.error(xhr.responseText);
                MessageToast.show("Upload failed: " + xhr.responseText);
              }
            });
    
          }.bind(this)).catch(function (err) {
            console.error(err);
            MessageToast.show("Error reading file");
          });
        },
    
        onAskQuestion: function () {
          const question = this.byId("questionInput").getValue();
          if (!question || !this.docID) {
            MessageToast.show("Please upload a PDF and enter a question.");
            return;
          }
    
          // Ask Question
          $.ajax({
            url: "./docqaDest/odata/v4/doc-qa/AskQuestion",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ question, docID: this.docID }),
            success: function (result) {
              //this.getView().getModel().setData(result);
               //  Keep only the first highlight
      const filtered = {
        answer: result.answer,
        highlights: result.highlights?.length ? [result.highlights[0]] : []
      };
      this.getView().getModel().setData(filtered);
            }.bind(this),
            error: function (xhr) {
              console.error(xhr.responseText);
              MessageToast.show("Failed to get answer: " + xhr.responseText);
            }
          });
        },
    
        _fileToBase64: function (file) {
          return new Promise(function (resolve, reject) {
            const reader = new FileReader();
            reader.onload = function () {
              const base64 = reader.result.split(",")[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }
    });
});