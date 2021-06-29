/**
 * Set stuff up.
 */
const diameter = 960
const svg = d3
  .select('svg')
  .attr('viewBox', '0 0 960 960')
  .attr('perserveAspectRatio', 'xMinYMid')
  .attr('width', window.innerWidth)
  .attr('height', window.innerHeight)

const margin = 20
const g = svg.append('g')

/**
 * Resize SVG accordingly.
 */
window.addEventListener('resize', function () {
  d3.select('svg')
    .attr('width', window.innerWidth)
    .attr('height', window.innerHeight)
})

/**
 * Pack it.
 */
const pack = d3
  .pack()
  .size([diameter - margin, diameter - margin])
  .padding(15)

/**
 * Get data and build.
 */
d3.json('https://api.jsonbin.io/b/60d2e88a8a4cd025b7a3b932/2', {
  headers: {
    'secret-key':
      '$2b$10$3gT4w2zMJdhZFLjtP8JrKuwEgU2s1d4oV4eJL2Iuk7kU3CTI0Wf6m\n',
  },
}).then(function (root) {
  // Looking for nodes suitable for zooming in
  svg.on('click', (event) => {
    const nodes = d3
      .selectAll(
        document.elementsFromPoint(...d3.pointer(event, g)).sort(sortBySize)
      )
      .filter('.node--parent, .node--leaf')
      .filter(zoomFilter)

    zoom(nodes.size() && nodes.datum())
  })

  // Sorts items in decreasing order of size
  function sortBySize(elA, elB) {
    return elA.getBoundingClientRect().width - elB.getBoundingClientRect().width
  }

  // Filter of nodes available for zoom in
  function zoomFilter(d) {
    const reference = getRefNode()
    return (
      d.parent === reference ||
      d.parent === reference.parent ||
      d === reference.parent
    )
  }

  // Gives focus or searches for a node considered as focus
  function getRefNode() {
    if (!focus) {
      const {
        x: viewX,
        y: viewY,
        width: viewW,
        height: viewH,
      } = svg.node().getBoundingClientRect()
      const nodes = d3
        .selectAll(
          document
            .elementsFromPoint(viewX + viewW / 2, viewY + viewH / 2)
            .sort(sortBySize)
        )
        .filter('.node--parent, .node--leaf')
        .select(function () {
          const { width } = this.getBoundingClientRect()
          return width > Math.min(viewW, viewH) ? this : null
        })
      return nodes.size() ? nodes.datum() : root
    }

    return focus
  }

  /**
   * Sort stuff.
   */
  root = d3
    .hierarchy(root)
    .sum(function (d) {
      return d.size
    })
    .sort(function (a, b) {
      return b.value - a.value
    })

  /**
   * Setup.
   */
  let focus = root
  let view
  const nodes = pack(root).descendants()

  /**
   * Circles.
   */
  const circle = g
    .selectAll('circle')
    .data(nodes)
    .enter()
    .append('circle')
    .attr('id', function (d) {
      return d.data.id
    })
    .attr('class', function (d) {
      return d.parent
        ? d.children
          ? 'node node--parent'
          : `node node--leaf ${
              d.data.slug ? d.data.slug.toLowerCase().replaceAll('_', '-') : ''
            }`
        : 'node node--root'
    })
    .attr('cx', (d) => d.x - diameter / 2)
    .attr('cy', (d) => d.y - diameter / 2)
    .attr('r', (d) => d.r)

  /**
   * Objects.
   */
  const objects = g
    .selectAll('foreignObject')
    .data(
      _.filter(nodes, function (o) {
        return !o.children && o.data.size
      })
    )
    .enter()
    .append('foreignObject')
    .attr('class', function (d) {
      return d.parent
        ? d.children
          ? 'node node--parent'
          : 'node node--leaf'
        : 'node node--root'
    })
    .attr('data-id', function (d) {
      return d.data.id
    })
    .attr('x', (d) => d.x - diameter / 2 - d.r)
    .attr('y', (d) => d.y - diameter / 2 - d.r)
    .attr('width', (d) => d.r * 2)
    .attr('height', (d) => d.r * 2)

  objects.append('xhtml:img').attr('src', function (d) {
    return 'https://source.unsplash.com/random'
  })

  objects.append('xhtml:p').text(function (d) {
    return d.data.name
  })

  /**
   * Other.
   */
  const node = g.selectAll('circle,text,foreignObject')
  // zoomTo([root.x, root.y, root.r * 2 + margin]);

  /**
   * Zoom to.
   */
  // function zoomTo(v) {
  //     const k = diameter / v[2];
  //     view = v;
  //     node.attr('transform', function (d) {
  //         return 'translate(' + (d.x - v[0]) * k + ',' + (d.y - v[1]) * k + ')';
  //     });
  //     circle.attr('r', function (d) {
  //         return d.r * k;
  //     });
  //     objects.each(function () {
  //         d3.select(this).attr('x', function (d) {
  //             return '-' + d.r * k;
  //         });
  //         d3.select(this).attr('y', function (d) {
  //             return '-' + d.r * k;
  //         });
  //         d3.select(this).attr('width', function (d) {
  //             return d.r * 2 * k;
  //         });
  //         d3.select(this).attr('height', function (d) {
  //             return d.r * 2 * k;
  //         });
  //     });
  // }

  /**
   * Mouse zoom functionality.
   */
  const zoomMouse = d3
    .zoom()
    .scaleExtent([1, 100])
    .on('zoom', (event) => {
      svg.selectAll('g').attr('transform', event.transform)

      // Resets the focus if the user changes the zoom manually
      if (event.sourceEvent) {
        focus = null
      }
    })

  function zoom(d) {
    focus = d

    svg
      .transition()
      .duration(750)
      .call(zoomMouse.transform, getZoomTransform(d))
  }

  // Returns the transformation object corresponding to the node or the initial transform if there is no argument
  function getZoomTransform(d) {
    if (d) {
      const x0 = d.x,
        y0 = d.y,
        x1 = d.x + d.r * 2,
        y1 = d.y + d.r * 2

      return d3.zoomIdentity
        .translate(diameter / 2, diameter / 2)
        .scale(1 / Math.min((x1 - x0) / diameter, (y1 - y0) / diameter))
        .translate(-x0 + diameter / 2, -y0 + diameter / 2)
    }

    return d3.zoomIdentity.translate(diameter / 2, diameter / 2)
  }

  svg.call(zoomMouse).call(zoomMouse.transform, getZoomTransform(null))
})
