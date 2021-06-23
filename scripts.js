/**
 * Set stuff up.
 */
const diameter = 960;
const svg = d3
    .select('svg')
    .attr('viewBox', '0 0 960 960')
    .attr('perserveAspectRatio', 'xMinYMid')
    .attr('width', window.innerWidth)
    .attr('height', window.innerHeight);
const margin = 20;
const g = svg
    .append('g')
    .attr('transform', 'translate(' + diameter / 2 + ',' + diameter / 2 + ')');

const transform = d3.zoomIdentity.translate(diameter / 2, diameter / 2);

/**
 * Resize SVG accordingly.
 */
window.addEventListener('resize', function () {
    d3.select('svg')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight);
});

/**
 * Color.
 */
/*
const color = d3
  .scaleLinear()
  .domain([-1, 5])
  .range(['hsl(150,53%,88%)', 'hsl(228,30%,40%)'])
  .interpolate(d3.interpolateHcl);
*/

/**
 * Pack it.
 */
const pack = d3
    .pack()
    .size([diameter - margin, diameter - margin])
    .padding(15);

/**
 * Get data and build.
 */
d3.json(
    'https://api.jsonbin.io/b/60d2e88a8a4cd025b7a3b932/2',
    {
        headers: {
            "secret-key": "$2b$10$3gT4w2zMJdhZFLjtP8JrKuwEgU2s1d4oV4eJL2Iuk7kU3CTI0Wf6m\n"
        }
    }
).then(function (root) {
    /**
     * Sort stuff.
     */
    root = d3
        .hierarchy(root)
        .sum(function (d) {
            return d.size;
        })
        .sort(function (a, b) {
            return b.value - a.value;
        });

    /**
     * Setup.
     */
    let focus = root;
    let view;
    const nodes = pack(root).descendants();

    /**
     * Circles.
     */
    const circle = g
        .selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('id', function (d) {
            return d.data.id;
        })
        .attr('class', function (d) {
            return d.parent
                ? d.children
                    ? 'node node--parent'
                    : `node node--leaf ${
                        d.data.slug
                            ? d.data.slug.toLowerCase().replaceAll('_', '-')
                            : ''
                    }`
                : 'node node--root';
        })
        /*
        .style('fill', function (d) {
          return d.children ? color(d.depth) : null;
        })
        .on('click', function (event, d) {
            if (focus !== d) {
                zoom(d);
                event.stopPropagation();
            }
        });
         */

    /**
     * Objects.
     */
    const objects = g
        .selectAll('foreignObject')
        .data(
            _.filter(nodes, function (o) {
                return !o.children && o.data.size;
            })
        )
        .enter()
        .append('foreignObject')
        .attr('class', function (d) {
            return d.parent
                ? d.children
                    ? 'node node--parent'
                    : 'node node--leaf'
                : 'node node--root';
        })
        .attr('data-id', function (d) {
            return d.data.id;
        });

    objects.append('xhtml:img').attr('src', function (d) {
        return 'https://source.unsplash.com/random';
    });

    objects.append('xhtml:p').text(function (d) {
        return d.data.name;
    });

    /**
     * Text.
     */
    /*
    const text = g
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .attr('class', 'label')
      .style('fill-opacity', function (d) {
        return d.parent === root ? 1 : 0;
      })
      .style('display', function (d) {
        return d.parent === root ? 'inline' : 'none';
      })
      .text(function (d) {
        return d.data.name;
      });
     */

    /**
     * Other.
     */
    const node = g.selectAll('circle,text,foreignObject');

    /*
    svg.on('click', function () {
        zoom(root);
    });
     */

    zoomTo([root.x, root.y, root.r * 2 + margin]);
    document.body.classList.add('is-out');

    /**
     * Zoom.
     */
    function zoom(d) {
        focus = d;

        d3.transition()
            .duration(750)
            .tween('zoom', function (d) {
                const i = d3.interpolateZoom(view, [
                    focus.x,
                    focus.y,
                    focus.r * 2 + margin,
                ]);
                return function (t) {
                    g.attr(
                        'transform',
                        'translate(' + diameter / 2 + ',' + diameter / 2 + ')'
                    );
                    zoomTo(i(t));
                };
            });

        /*
        transition
          .selectAll('text')
          .filter(function (d) {
            return d.parent === focus || this.style.display === 'inline';
          })
          .style('fill-opacity', function (d) {
            return d.parent === focus ? 1 : 0;
          })
          .on('start', function (d) {
            if (d.parent === focus) {
              document.body.classList.remove('is-in');
              document.body.classList.add('is-out');
            }
          })
          .on('end', function (d) {
            if (d.parent !== focus) {
              document.body.classList.remove('is-out');
              document.body.classList.add('is-in');
            }
          });
          */
    }

    /**
     * Zoom to.
     */
    function zoomTo(v) {
        const k = diameter / v[2];
        view = v;
        node.attr('transform', function (d) {
            return 'translate(' + (d.x - v[0]) * k + ',' + (d.y - v[1]) * k + ')';
        });
        circle.attr('r', function (d) {
            return d.r * k;
        });
        objects.each(function () {
            d3.select(this).attr('x', function (d) {
                return '-' + d.r * k;
            });
            d3.select(this).attr('y', function (d) {
                return '-' + d.r * k;
            });
            d3.select(this).attr('width', function (d) {
                return d.r * 2 * k;
            });
            d3.select(this).attr('height', function (d) {
                return d.r * 2 * k;
            });
        });
    }

    /**
     * Mouse zoom functionality.
     */
    const zoomMouse = d3
        .zoom()
        .scaleExtent([1, 8])
        .on('zoom', function (event) {
            svg.selectAll('g').attr('transform', event.transform);
        });

    svg.call(zoomMouse).call(zoomMouse.transform, transform);
});
