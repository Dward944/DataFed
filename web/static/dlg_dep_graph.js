function dlgDepGraph( main, a_id ){
    var frame = $(document.createElement('div'));
    var html = "<style>\
        .links .derivation{\
            stroke: #900;\
            stroke-width: 2px;\
        }\
        .links .component{\
            stroke: #999;\
            stroke-width: 2px;\
        }\
        .links .new-version{\
            stroke: #449;\
            stroke-width: 2px;\
        }\
        .node circle {\
            stroke: #fff;\
            stroke-width: 1.5px;\
        }\
        .highlight{\
            stroke:#0f0!important;\
            stroke-width:2px!important;\
            fill:none!important;\
        }\
        .hidden{\
            display:none!important;\
        }\
        text {\
            font-family: sans-serif;\
            font-size: 14px;\
        }\
        </style>\
        <div class='row-flex' style='flex:1 1 auto;height:100%'>\
            <svg class='' style='flex:1 1 auto;background:#000'>\
            </svg>\
            <div style='flex:none;height:100%'>\
                <div class='col-flex' style='height:100%'>\
                    <div style='flex:none;padding:.25em' class='ui-widget-header'>Selection Information:</div>\
                    <div class='ui-widget-content' style='flex:1 1 auto;border-bottom:0;overflow:auto;padding:.25em'>\
                        ID: <span id='dlg_sel_id'></span><br>\
                        Alias: <br>\
                        Title: <br>\
                        Description<br>\
                        Metadata:<br>\
                    </div>\
                </div>\
            </div>\
        </div>";

    frame.html( html );

    function simTick() {
        //console.log("tick");
        nodes
            .attr("transform", function(d) {
                //console.log("d:",d);
                return "translate(" + d.x + "," + d.y + ")"; });

        links
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
    }


    function dragStarted(d) {
        console.log("drag start",d.id);
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
        /*d.x += d3.event.dx;
        d.y += d3.event.dy;
        d.px += d3.event.dx;
        d.py += d3.event.dy; */
        simTick(); 
    }

    function dragEnded(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    function defineArrowMarker( svg, name, color ){
        svg.append('defs').append('marker')
            .attr('id',name)
            //.attr('viewBox','-0 -3 6 6')
            .attr('refX',13)
            .attr('refY',2)
            .attr('orient','auto')
            .attr('markerWidth',20)
            .attr('markerHeight',10)
            //.attr('xoverflow','visible')
            .append('svg:path')
            .attr('d', 'M 0,0 L 6,2 L 0,4')
            .attr('fill', color )
            .style('stroke-width','1px')
            .style('stroke',color);
    }

    var r = 10;
    var node_data, nodes_grp, nodes;
    var link_data, links_grp, links;
    var svg, simulation;

    function showSelectedNode(d){
        $("#dlg_sel_id",frame).html(d.id);
    }

    function loadGraph( a_cb ){
        node_data = [
            {"id": "A","row":0,"col":0},
            {"id": "B","row":1,"col":0},
            {"id": "C"},
        ];

        link_data = [
            {source:"B", target:"A",ty:0,id:'B-A'},
            {source: "C" , target:"B",ty:1,id:'C-B'},
        ];

        a_cb();
    }

    function refreshGraph(){
        var g;

        links = links_grp.selectAll('line')
            .data( link_data, function(d) { return d.id; });

        links.enter()
            .append("line")
                .attr('marker-end',function(d){
                    switch ( d.ty ){
                        case 0: return 'url(#arrow0)';
                        case 1: return 'url(#arrow1)';
                        case 2: return 'url(#arrow2)';
                    }
                })
                .attr('class',function(d){
                    console.log("new link",d.source,d.target,d.ty);
                    switch ( d.ty ){
                        case 0: return 'link derivation';
                        case 1: return 'link component';
                        case 2: return 'link new-version';
                    }
                });

        links.exit()
            .remove();

        links = links_grp.selectAll('line');

        nodes = nodes_grp.selectAll('g')
            .data( node_data, function(d) { return d.id; });

        g = nodes.enter()
            .append("g")
                .attr("class", "node");

        g.append("circle")
            .attr("r", r)
            .attr("fill", "red")
            .on("click", function(d,i){
                console.log("click",d.id);
                d3.select(".highlight")
                    .attr("class","select hidden");
                d3.select(this.parentNode).select(".select")
                    .attr("class","select highlight");
                showSelectedNode(d);
            })
            .call(d3.drag()
                .on("start", dragStarted)
                .on("drag", dragged)
                .on("end", dragEnded));

        g.append("circle")
            .attr("r", r*1.5)
            .attr("class", "select hidden");

        g.append("text")
            .text(function(d) {
                return d.id;
            })
            .attr('x', r)
            .attr('y', -r)
            .attr("fill", "white");

        nodes.exit()
            .remove();

        nodes = nodes_grp.selectAll('g');

        if ( simulation ){
            console.log("restart sim");
            simulation
                .nodes(node_data)
                .force("link").links(link_data);

            simulation.alpha(1).restart();
        }else{
            var linkForce = d3.forceLink(link_data)
                .strength(function(d){
                    switch(d.ty){
                        case 0: return .03;
                        case 1: return .2;
                        case 2: return .01;
                    }
                })
                .id( function(d) { return d.id; })

            simulation = d3.forceSimulation()
                .nodes(node_data)
                .force('charge', d3.forceManyBody()
                    .strength(-200))
                .force('row', d3.forceY( function(d,i){ return d.row != undefined ?(150 + d.row*75):0; })
                    .strength( function(d){ return d.row != undefined ?.1:0; }))
                .force('col', d3.forceX(function(d,i){ return d.col != undefined?(150 + d.col*100):0; })
                    .strength( function(d){ return d.col != undefined ?.1:0; }))
                .force("link", linkForce )
                .on('tick', simTick);
        }
    }

    var options = {
        title: "Dependency Graph for Data Record " + a_id,
        modal: true,
        width: 650,
        height: 550,
        resizable: true,
        closeOnEscape: true,
        buttons:[{
            text: "Edit",
            click: function(){
            }
        },{
            text: "Share",
            click: function(){
            }
        },{
            text: "Lock",
            click: function(){
            }
        },{
            text: "Unlock",
            click: function(){
            }
        },{
            text: "Get",
            click: function(){
            }
        },{
            text: "Put",
            click: function(){
            }
        },{
            text: "Close",
            click: function() {
                $(this).dialog('destroy').remove();
            }
        }],
        open: function(event,ui){
            $(this).css('padding', '0');
            $('.ui-dialog-buttonpane').css('margin','0');

            svg = d3.select("svg")
            .call(d3.zoom().on("zoom", function () {
                svg.attr("transform", d3.event.transform)
            }))
            .append("g");

            defineArrowMarker(svg, "arrow0","#900");
            defineArrowMarker(svg, "arrow1","#999");
            defineArrowMarker(svg, "arrow2","#449");

            links_grp = svg.append("g")
            .attr("class", "links");

            nodes_grp = svg.append("g")
                .attr("class", "nodes");

            loadGraph( function() {
                refreshGraph( );
            });

            setTimeout( function(){
                console.log("alter graph");
                

                node_data.push({"id": "D1"});
                node_data.push({"id": "D2"});
                node_data.push({"id": "X","row":2,"col":0});
                node_data.push({"id": "D4"});
                node_data.push({"id": "D5"});
                node_data.push({"id": "E","row":3,"col":0});
                node_data.push({"id": "F","row":3,"col":0});
                node_data.push({"id": "P","row":0,"col":1});
                node_data.push({"id": "Q","row":1,"col":1});

                link_data.push({source:"X", target:"B",ty:0,id:'X-B'});
                link_data.push({source:"E", target:"X",ty:0,id:'E-X'});
                link_data.push({source:"F", target:"X",ty:0,id:'F-X'});
                link_data.push({source: "D1", target:"B",ty:1,id:'D1-B'});
                link_data.push({source: "D2", target:"B",ty:1,id:'D2-B'});
                link_data.push({source: "D4", target:"B",ty:1,id:'D4-B'});
                link_data.push({source: "D5", target:"B",ty:1,id:'D5-B'});
                link_data.push({source: "Q" , target:"P",ty:1,id:'Q-P'});
                link_data.push({source: "Q" , target:"C",ty:1,id:'Q-C'});
                link_data.push({source: "P", target: "A",ty:2,id:'P-A'});
                link_data.push({source: "Q", target: "F",ty:2,id:'Q-F'});

                refreshGraph();
            }, 5000 );

            setTimeout( function(){
                console.log("alter graph 2");
                node_data = [
                    {"id": "A","row":0,"col":0},
                    {"id": "B","row":1,"col":0},
                    {"id": "C"},
                    {"id": "D1"},
                    {"id": "D2"},
                    {"id": "X","row":2,"col":0},
                    {"id": "D4"},
                    {"id": "D5"},
                    {"id": "E","row":3,"col":0},
                    {"id": "F","row":3,"col":0}
                ];

                link_data = [
                    {source:"B", target:"A",ty:0,id:'B-A'},
                    {source:"X", target:"B",ty:0,id:'X-B'},
                    {source:"E", target:"X",ty:0,id:'E-X'},
                    {source:"F", target:"X",ty:0,id:'F-X'},
                    {source: "D1", target:"B",ty:1,id:'D1-B'},
                    {source: "D2", target:"B",ty:1,id:'D2-B'},
                    {source: "D4", target:"B",ty:1,id:'D4-B'},
                    {source: "D5", target:"B",ty:1,id:'D5-B'},
                    {source: "C", target:"B",ty:1,id:'C-B'}
                ];
                refreshGraph();
            }, 10000 );
        }
    };

    frame.dialog( options );
}
