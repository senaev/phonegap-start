const API_URL = 'https://senaev.com/tubes';

/**
 * Запрашивает все имеющиеся трубы
 */
async function requestAllTubes() {
    const query = `SELECT * FROM tubes;`;

    const response = await fetch(API_URL, {
        method: 'post',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({query: query}),
    });
    const text = await response.text();
    const data = JSON.parse(text);
    return data.result.rows;
}

/**
 * Добавляет трубу, возвращает ее-же уже с айдишником
 */
async function addTube(state_standard, price) {
    const query = `INSERT INTO tubes (state_standard, price)
                VALUES ('${state_standard}', ${price})
                RETURNING *;`;

    const response = await fetch(API_URL, {
        method: 'post',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({query: query}),
    });
    const text = await response.text();
    const data = JSON.parse(text);

    if (data.error) {
        throw new Error(JSON.stringify(data.error));
    }

    return data.result.rows[0];
}

/**
 * Редактируем данные о трубе
 */
async function editTube(tube) {
    const query = `UPDATE tubes
                    SET state_standard = '${tube.state_standard}',
                        price = ${tube.price}
                    WHERE
                       tube_id = ${tube.tube_id};`;

    const response = await fetch(API_URL, {
        method: 'post',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({query: query}),
    });
    const text = await response.text();
    const data = JSON.parse(text);

    if (data.error) {
        throw new Error(JSON.stringify(data.error));
    }

    return tube;
}

/**
 * Удаляем трубу из базы данных
 */
async function removeTubeById(tube_id) {
    const query = `DELETE FROM tubes
                    WHERE tube_id=${tube_id};;`;

    const response = await fetch(API_URL, {
        method: 'post',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({query: query}),
    });
    const text = await response.text();
    const data = JSON.parse(text);

    if (data.error) {
        throw new Error(JSON.stringify(data.error));
    }
}

class App {
    constructor() {
        this.actionsTemplate = $("#actions-template").html();
        this.table = $("table");
        this.addNewButton = $(".add-new");
        this.tubes = {};

        this.init();
    }

    async init() {

        const allTubes = await requestAllTubes();
        allTubes.forEach((tube) => {
            this.addTube(tube);
        });

        // добавляем новую запись
        this.addNewButton.click(() => {
            this.editRow(undefined);
        });
    }

    addTube(tube) {
        const { tube_id } = tube;

        const row = $(`<tr>
            <td>${tube.state_standard}</td>
            <td>${tube.price}</td>
            <td>
                <a class="edit" title="Редактировать" data-toggle="tooltip"><i class="material-icons">&#xE254;</i></a>
                <a class="delete" title="Удалить" data-toggle="tooltip"><i class="material-icons">&#xE872;</i></a>
            </td>
        </tr>`);

        $(row.find('.delete')).click(async () => {
            try {
                await removeTubeById(tube_id);
                row.remove();
                delete this.tubes[tube_id];
            } catch (error) {
                console.error(error);
                alert(`Ошибка: ${error.message}`);
            }
        });


        $(row.find('.edit')).click(async () => {
            this.editRow(tube_id);
        });

        this.tubes[tube_id] = {
            element: row,
            tube: tube,
        };

        this.table.append(row);
    }

    // Если rowId передано - редактируем существующую, если нет - добавляем новую
    async editRow(tube_id) {
        this.addNewButton.attr("disabled", "disabled");

        await new Promise((resolve) => {
            const tube = tube_id === undefined
                ? {}
                : this.tubes[tube_id].tube;

            const row = $(`<tr>
                <td><input type="text" class="form-control" name="name" id="name" value="${tube.state_standard || ''}"></td>
                <td><input type="text" class="form-control" name="price" id="price" value="${tube.price || ''}"></td>
                <td>
                    <a class="add" title="Добавить" data-toggle="tooltip"><i class="material-icons">&#xE03B;</i></a>
                    <a class="delete" title="Удалить" data-toggle="tooltip"><i class="material-icons">&#xE872;</i></a>
                </td>
            </tr>`);

            if (tube_id === undefined) {
                this.table.append(row);
            } else {
                $(this.tubes[tube_id].element).replaceWith(row);
            }

            row.find('.add').click(async () => {
                var empty = false;
                var input = row.find('input[type="text"]');
                input.each(function () {
                    // валидация значения
                    if (!$(this).val()) {
                        $(this).addClass("error");
                        empty = true;
                    } else {
                        $(this).removeClass("error");
                    }
                });
                $(this).parents("tr").find(".error").first().focus();
                if (empty) {
                    return;
                }

                const state_standard = row.find('#name').val();
                const price = row.find('#price').val();

                try {
                    const tube = tube_id === undefined
                        ? await addTube(state_standard, price)
                        : await editTube({
                            tube_id,
                            state_standard,
                            price,
                        });

                    row.remove();
                    this.addTube(tube);
                    resolve();
                } catch (error) {
                    console.error(error);
                    alert(`Ошибка: ${error.message}`);
                }
            });

            row.find('.delete').click(() => {
                row.remove();
                resolve();
            });
        });

        this.addNewButton.removeAttr("disabled");
    }
}

$(document).ready(function () {
    new App();
});
