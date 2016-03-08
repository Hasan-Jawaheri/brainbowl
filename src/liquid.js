var bottle = null;
window.addEventListener('load', function() {
    bottle = new Bottle(document.getElementById('display'));
    function step() {
        bottle.step();
    }
    function render() {
        bottle.render();
        window.requestAnimationFrame(render);
    }
    window.requestAnimationFrame(render);
    setInterval(step, 1000 / Bottle.FPS);

    reposition_names();
});

function update_team(id) {
    var num = id[1];
    $("#name" + num)[0].innerHTML = $("#" + id)[0].value;
    reposition_names();
}

function reposition_names() {
    var positions = [
        [-380, -160],
        [-140, -230],
        [ 140, -160],
        [ 380, -230],
    ];
    for (var i = 0; i < 4; i++) {
        var name = $("#name" + i);
        var width = name[0].clientWidth;
        var height = name[0].clientHeight;
        var canvasCenterX = $("#display").offset().left + $("#display")[0].clientWidth / 2;
        var canvasCenterY = $("#display").offset().top - $("#display")[0].clientHeight / 2;
        console.log(canvasCenterX);

        name.css('margin-left', (canvasCenterX + positions[i][0] - width / 2) + 'px');
        name.css('margin-top', (canvasCenterY + positions[i][1] - height / 2) + 'px');
    }
}

window.addEventListener("resize", reposition_names);
