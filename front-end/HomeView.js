/*
    This is a sample JavaScript file to display a home page for web-based hybrid app
*/

define(['jquery', 'underscore', 'Backbone', 'text!views/home/HomeView.tpl', 'views/home/HomeViewList'],
    function ($, _, Backbone, HomeViewTemplate, HomeViewList) {
        var HomeView = Backbone.View.extend({
            el:'#container',

			// no gesture on home page
            events:{
            },
			
            initialize: function(){
            },

            render:function () {
                var baseURL = 'img/';

                // get home view template and set content
                this.template = _.template(HomeViewTemplate);

                // create model for this view
                var homeModel = Constants.getHomeConf();
                this.model = new Backbone.Model.extend(homeModel);

                // render
                this.$el.html(this.template(this.model.attributes));
                this.createPage();
                if ($('#container').hasClass('home-page-center')){
                    $('#conatiner').addClass('home-page-center');
                }

                // add header
                var HeaderView = require('views/header/HeaderView');
                var header = new HeaderView({
                    el: this.$el.find('.ui-header'),
                    collection: homeModel.header
                });
                header.render();
                $('#container').removeClass('ui-page-header-fixed');

                // logo and background
                $('#logo img').attr('src', baseURL+homeModel.logo);

                // customize view content
                this.loadHomeViewList();
                this.removeBackEventListener();
                return this;
            },

            loadHomeViewList: function (){
                var homeViewCollection  = Constants.getHomeView();
                var listView = new HomeViewList({
                    el          : $('#homeview-list', this.el),
                    collection  : homeViewCollection
                });
                listView.render();
            }
        });
        return HomeView;
    });
