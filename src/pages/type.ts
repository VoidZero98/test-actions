import { h } from "vue";
import { NButton } from "naive-ui";
import { createDiscreteApi, lightTheme } from "naive-ui";

const { message } = createDiscreteApi(["message"], {
  configProviderProps: { theme: lightTheme },
});

export interface Song {
  no: number;
  title: string;
  length: string;
}

export const columns = [
  {
    type: "selection",
    disabled(row: Song) {
      return row.no === 4;
    },
  },
  {
    title: "No",
    key: "no",
    align: "center",
    sorter: "default",
  },
  {
    title: "Title",
    key: "title",
    align: "center",
  },
  {
    title: "Length",
    key: "length",
    align: "center",
  },
  {
    title: "Action",
    key: "actions",
    align: "center",
    render(row: Song) {
      return h(
        NButton,
        {
          type: "error",
          size: "small",
          quaternary: true,
          onClick: () => {
            message.info(`${row.no} deleted successfully`);
          },
        },
        { default: () => "Delete" }
      );
    },
  },
];
